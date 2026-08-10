/**
 * Centralized Enterprise Leave Approval Workflow.
 * Controllers must not contain workflow logic — TeamService delegates here.
 *
 * Flow: Employee → Manager → HR → Final → Attendance → Balance → Audit
 */

import {
  NotificationCategory,
  NotificationPriority,
  prisma,
  type LeaveType,
} from "@enterprise/database";
import { UserRole } from "@enterprise/shared";

import { notificationDispatcher } from "../../notifications/notification.dispatcher.js";
import { sodPolicyService } from "../../../shared/security/sod/index.js";
import type { SodActorContext } from "../../../shared/security/sod/index.js";
import { logger } from "../../../shared/security/logger.js";
import { TEAM_AUDIT_ACTIONS, logTeamAuditEvent } from "../team.audit.js";
import { TEAM_ERROR_CODES, TeamError } from "../team.errors.js";
import { teamRepository } from "../team.repository.js";
import {
  getLeaveApprovalConfig,
  getLeaveAutoExpireDays,
} from "./leave-approval.config.js";
import {
  deleteLeaveWorkflowStage,
  getLeaveWorkflowStage,
  listExpiredInProgressLeaveWorkflowStages,
  saveLeaveWorkflowStage,
} from "./leave-approval.store.js";
import {
  LEAVE_TIMELINE_EVENTS,
  LEAVE_WORKFLOW_AUDIT,
  type LeaveConflict,
  type LeaveReviewDecision,
  type LeaveWorkflowActor,
  type LeaveWorkflowReviewResult,
  type LeaveWorkflowStageRecord,
  type LeaveWorkflowState,
  type LeaveWorkflowSubmitResult,
} from "./leave-approval.types.js";
import {
  balanceFieldsForDeduction,
  detectLeaveConflicts,
  loadHolidayDateKeys,
  resolveEnterpriseLeaveType,
  validateLeaveBalance,
} from "./leave-approval.validation.js";

function toSodActor(actor: LeaveWorkflowActor): SodActorContext {
  return {
    userId: actor.userId,
    role: actor.role,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  };
}

function isSuperAdmin(actor: LeaveWorkflowActor): boolean {
  return actor.role === UserRole.SUPER_ADMIN;
}

function isAdmin(actor: LeaveWorkflowActor): boolean {
  return actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN;
}

function hasPermission(actor: LeaveWorkflowActor, key: string): boolean {
  return actor.permissions.includes(key) || actor.permissions.includes("*");
}

function isHrActor(actor: LeaveWorkflowActor): boolean {
  return isAdmin(actor) || hasPermission(actor, "team:manage");
}

function ttlMsFromExpiresAt(expiresAt: string): number {
  const ms = Date.parse(expiresAt) - Date.now() + 7 * 86_400_000;
  return Math.max(86_400_000, ms);
}

/** Never log medical / clinical detail fields. */
function safeAuditMetadata(
  type: LeaveType,
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = { ...metadata, leaveType: type };
  delete safe.reason;
  delete safe.medicalDetails;
  delete safe.diagnosis;
  delete safe.notes;
  if (type === "SICK") {
    delete safe.reviewNote;
  }
  return safe;
}

async function writeWorkflowAudit(input: {
  actor?: LeaveWorkflowActor | null;
  action: string;
  leaveId: string;
  type: LeaveType;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await logTeamAuditEvent({
    userId: input.actor?.userId ?? null,
    action: input.action,
    resourceId: input.leaveId,
    metadata: safeAuditMetadata(input.type, input.metadata ?? {}),
    ipAddress: input.actor?.ipAddress,
    userAgent: input.actor?.userAgent,
  });
}

async function writeTimeline(input: {
  employeeId: string;
  eventType: string;
  title: string;
  description: string;
  actedById: string | null;
}): Promise<void> {
  await prisma.employeeTimelineEvent.create({
    data: {
      employeeId: input.employeeId,
      eventType: input.eventType,
      title: input.title,
      description: input.description,
      actedById: input.actedById,
    },
  });
}

async function notifySafe(
  input: Parameters<typeof notificationDispatcher.notify>[0],
): Promise<void> {
  try {
    await notificationDispatcher.notify(input);
  } catch (error) {
    logger.warn(
      `[leave-workflow] notify failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

type LeaveWithEmployee = NonNullable<
  Awaited<ReturnType<typeof teamRepository.getLeave>>
>;

const userSelectForLeave = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
  role: { select: { code: true, name: true } },
} as const;

const employeeIncludeForLeave = {
  user: { select: userSelectForLeave },
  department: true,
  primaryTeam: { select: { id: true, name: true } },
  manager: { select: userSelectForLeave },
  createdBy: { select: userSelectForLeave },
} as const;

function assertEmployeeCannotApprove(
  actor: LeaveWorkflowActor,
  subjectUserId: string | null | undefined,
): void {
  if (subjectUserId && actor.userId === subjectUserId) {
    throw new TeamError(
      "Employees cannot approve their own leave",
      403,
      TEAM_ERROR_CODES.FORBIDDEN,
    );
  }
}

async function isManagerOfEmployee(
  actor: LeaveWorkflowActor,
  employee: LeaveWithEmployee["employee"],
): Promise<boolean> {
  if (!employee) return false;
  if (employee.managerId && employee.managerId === actor.userId) return true;

  if (employee.primaryTeamId) {
    const team = await prisma.team.findFirst({
      where: { id: employee.primaryTeamId, deletedAt: null },
      select: { leaderId: true },
    });
    if (team?.leaderId === actor.userId) return true;
  }

  const ledTeamMember = await prisma.teamMember.findFirst({
    where: {
      userId: employee.userId,
      team: { deletedAt: null, leaderId: actor.userId },
    },
    select: { id: true },
  });
  return Boolean(ledTeamMember);
}

function initialWorkflowState(config: {
  managerApprovalRequired: boolean;
  hrApprovalRequired: boolean;
}): LeaveWorkflowState {
  void config;
  return "SUBMITTED";
}

function buildStageRecord(input: {
  leaveId: string;
  employeeId: string;
  subjectUserId: string;
  state: LeaveWorkflowState;
  submittedAt?: string;
  prior?: LeaveWorkflowStageRecord | null;
}): LeaveWorkflowStageRecord {
  const now = new Date().toISOString();
  const expireDays = getLeaveAutoExpireDays();
  const submittedAt = input.submittedAt ?? input.prior?.submittedAt ?? now;
  const expiresAt =
    input.prior?.expiresAt ??
    new Date(
      Date.parse(submittedAt) + expireDays * 86_400_000,
    ).toISOString();

  return {
    leaveId: input.leaveId,
    employeeId: input.employeeId,
    subjectUserId: input.subjectUserId,
    state: input.state,
    managerApproverId: input.prior?.managerApproverId ?? null,
    managerApprovedAt: input.prior?.managerApprovedAt ?? null,
    hrApproverId: input.prior?.hrApproverId ?? null,
    hrApprovedAt: input.prior?.hrApprovedAt ?? null,
    finalApproverId: input.prior?.finalApproverId ?? null,
    finalApprovedAt: input.prior?.finalApprovedAt ?? null,
    overrideById: input.prior?.overrideById ?? null,
    overrideAt: input.prior?.overrideAt ?? null,
    overrideAction: input.prior?.overrideAction ?? null,
    submittedAt,
    expiresAt,
    updatedAt: now,
  };
}

async function persistStage(record: LeaveWorkflowStageRecord): Promise<void> {
  await saveLeaveWorkflowStage(record, ttlMsFromExpiresAt(record.expiresAt));
}

async function resolveStage(
  leave: LeaveWithEmployee,
): Promise<LeaveWorkflowStageRecord> {
  const existing = await getLeaveWorkflowStage(leave.id);
  if (existing) return existing;

  const subjectUserId = leave.employee?.userId ?? leave.createdById ?? "";
  let state: LeaveWorkflowState = "SUBMITTED";
  switch (leave.status) {
    case "PENDING":
      state = "SUBMITTED";
      break;
    case "APPROVED":
      state = "FINAL_APPROVED";
      break;
    case "REJECTED":
      state = "FINAL_REJECTED";
      break;
    case "CANCELLED":
      state = "CANCELLED";
      break;
    default: {
      const _exhaustive: never = leave.status;
      return _exhaustive;
    }
  }

  return buildStageRecord({
    leaveId: leave.id,
    employeeId: leave.employeeId,
    subjectUserId,
    state,
    submittedAt: leave.createdAt.toISOString(),
  });
}

async function notifyStakeholders(input: {
  leaveId: string;
  type: LeaveType;
  employeeUserId: string;
  managerUserId?: string | null;
  title: string;
  body: string;
  createdById?: string | null;
  includeHr?: boolean;
  finalApproverId?: string | null;
}): Promise<void> {
  const audiences: Array<{ userId: string }> = [
    { userId: input.employeeUserId },
  ];
  if (input.managerUserId) audiences.push({ userId: input.managerUserId });
  if (input.finalApproverId) {
    audiences.push({ userId: input.finalApproverId });
  }

  const unique = [...new Set(audiences.map((a) => a.userId).filter(Boolean))];
  for (const userId of unique) {
    await notifySafe({
      title: input.title,
      body: input.body,
      category: NotificationCategory.SYSTEM,
      priority: NotificationPriority.NORMAL,
      linkUrl: "/team",
      entityType: "LeaveRequest",
      entityId: input.leaveId,
      audience: { type: "INDIVIDUAL", userId },
      createdById: input.createdById ?? null,
      sendEmail: true,
    });
  }

  if (input.includeHr) {
    await notifySafe({
      title: input.title,
      body: input.body,
      category: NotificationCategory.TEAM,
      priority: NotificationPriority.NORMAL,
      linkUrl: "/team",
      entityType: "LeaveRequest",
      entityId: input.leaveId,
      audience: { type: "ROLE", roleCode: "ADMIN" },
      createdById: input.createdById ?? null,
      sendEmail: false,
    });
  }
}

async function applyFinalSideEffects(input: {
  leave: LeaveWithEmployee;
  actor: LeaveWorkflowActor;
  billableDays: number;
  enterpriseType: ReturnType<typeof resolveEnterpriseLeaveType>;
}): Promise<void> {
  const employee = input.leave.employee;
  if (!employee) return;

  const balanceUpdate = balanceFieldsForDeduction(
    input.enterpriseType,
    input.billableDays,
    {
      annualLeaveBalance: employee.annualLeaveBalance,
      casualLeaveBalance: employee.casualLeaveBalance,
      sickLeaveBalance: employee.sickLeaveBalance,
      medicalLeaveBalance: employee.medicalLeaveBalance,
    },
  );

  if (Object.keys(balanceUpdate).length > 0) {
    await teamRepository.updateEmployee(employee.id, {
      ...balanceUpdate,
      updatedById: input.actor.userId,
    });
  }

  const days = eachDateInclusive(input.leave.startDate, input.leave.endDate);
  const attendanceStatus =
    input.enterpriseType === "WORK_FROM_HOME" ? "REMOTE" : "ABSENT";

  for (const date of days) {
    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date,
        deletedAt: null,
      },
      select: { id: true, checkInAt: true, status: true },
    });
    if (existing?.checkInAt) continue;
    if (existing) {
      await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: attendanceStatus,
          notes: `Leave:${input.leave.type}`,
          updatedById: input.actor.userId,
        },
      });
    } else {
      await prisma.attendance.create({
        data: {
          employeeId: employee.id,
          date,
          status: attendanceStatus,
          notes: `Leave:${input.leave.type}`,
          createdById: input.actor.userId,
          updatedById: input.actor.userId,
        },
      });
    }
  }
}

function eachDateInclusive(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  let cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const last = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  );
  while (cursor.getTime() <= last.getTime()) {
    out.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return out;
}

export class LeaveApprovalWorkflowService {
  /**
   * Validate + open workflow on leave submission (called after create or before).
   * Performs balance validation and conflict detection.
   */
  async assertCanSubmit(input: {
    actor: LeaveWorkflowActor;
    employeeId: string;
    subjectUserId: string;
    type: LeaveType;
    reason?: string | null;
    start: Date;
    end: Date;
    balances: {
      annualLeaveBalance: number;
      casualLeaveBalance: number;
      sickLeaveBalance: number;
      medicalLeaveBalance: number;
    };
    employeeShift?: string | null;
    excludeLeaveId?: string;
  }): Promise<{
    billableDays: number;
    enterpriseType: ReturnType<typeof resolveEnterpriseLeaveType>;
    conflicts: LeaveConflict[];
  }> {
    const holidayDates = await loadHolidayDateKeys(input.start, input.end);
    const balance = validateLeaveBalance({
      type: input.type,
      reason: input.reason,
      start: input.start,
      end: input.end,
      holidayDates,
      balances: input.balances,
    });

    if (!balance.ok) {
      await writeWorkflowAudit({
        actor: input.actor,
        action: LEAVE_WORKFLOW_AUDIT.BALANCE_DENY,
        leaveId: input.excludeLeaveId ?? input.employeeId,
        type: input.type,
        metadata: {
          errors: balance.errors,
          enterpriseType: balance.enterpriseType,
          billableDays: balance.billableDays,
        },
      });
      throw new TeamError(
        balance.errors[0] ?? "Leave balance validation failed",
        400,
        TEAM_ERROR_CODES.VALIDATION,
      );
    }

    const conflicts = await detectLeaveConflicts({
      employeeId: input.employeeId,
      subjectUserId: input.subjectUserId,
      start: input.start,
      end: input.end,
      excludeLeaveId: input.excludeLeaveId,
      employeeShift: input.employeeShift,
      enterpriseType: balance.enterpriseType,
      holidayDates,
    });

    const blocking = conflicts.conflicts.filter(
      (c) =>
        c.kind === "DUPLICATE_LEAVE" ||
        c.kind === "EXISTING_LEAVE_OVERLAP" ||
        c.kind === "ATTENDANCE_CONFLICT" ||
        c.kind === "HOLIDAY_OVERLAP",
    );

    if (blocking.length > 0) {
      await writeWorkflowAudit({
        actor: input.actor,
        action: LEAVE_WORKFLOW_AUDIT.CONFLICT_DENY,
        leaveId: input.excludeLeaveId ?? input.employeeId,
        type: input.type,
        metadata: {
          conflicts: blocking.map((c) => ({
            kind: c.kind,
            message: c.message,
          })),
        },
      });
      throw new TeamError(
        blocking[0]?.message ?? "Leave conflict detected",
        409,
        TEAM_ERROR_CODES.CONFLICT,
      );
    }

    return {
      billableDays: balance.billableDays,
      enterpriseType: balance.enterpriseType,
      conflicts: conflicts.conflicts,
    };
  }

  async onSubmitted(input: {
    leave: LeaveWithEmployee;
    actor: LeaveWorkflowActor;
    billableDays: number;
  }): Promise<LeaveWorkflowSubmitResult> {
    const config = getLeaveApprovalConfig();
    const subjectUserId = input.leave.employee?.userId ?? input.actor.userId;
    const stage = buildStageRecord({
      leaveId: input.leave.id,
      employeeId: input.leave.employeeId,
      subjectUserId,
      state: initialWorkflowState(config),
      submittedAt: input.leave.createdAt.toISOString(),
    });
    await persistStage(stage);

    await writeTimeline({
      employeeId: input.leave.employeeId,
      eventType: LEAVE_TIMELINE_EVENTS.SUBMITTED,
      title: "Leave submitted",
      description: `${input.leave.type} · ${input.billableDays} day(s)`,
      actedById: input.actor.userId,
    });

    await writeWorkflowAudit({
      actor: input.actor,
      action: LEAVE_WORKFLOW_AUDIT.SUBMIT,
      leaveId: input.leave.id,
      type: input.leave.type,
      metadata: {
        workflowState: stage.state,
        billableDays: input.billableDays,
        managerRequired: config.managerApprovalRequired,
        hrRequired: config.hrApprovalRequired,
      },
    });

    await logTeamAuditEvent({
      userId: input.actor.userId,
      action: TEAM_AUDIT_ACTIONS.LEAVE_APPLY,
      resourceId: input.leave.id,
      metadata: safeAuditMetadata(input.leave.type, {
        workflowState: stage.state,
      }),
      ipAddress: input.actor.ipAddress,
      userAgent: input.actor.userAgent,
    });

    await notifyStakeholders({
      leaveId: input.leave.id,
      type: input.leave.type,
      employeeUserId: subjectUserId,
      managerUserId: input.leave.employee?.managerId,
      title: "Leave request submitted",
      body: `A ${input.leave.type.toLowerCase()} leave request is awaiting review.`,
      createdById: input.actor.userId,
      includeHr: true,
    });

    return {
      workflowState: "SUBMITTED",
      billableDays: input.billableDays,
      stageRecord: stage,
      conflicts: [],
    };
  }

  /**
   * Multi-stage review via existing APPROVED | REJECTED API contract.
   */
  async review(input: {
    leaveId: string;
    decision: LeaveReviewDecision;
    reviewNote?: string | null;
    actor: LeaveWorkflowActor;
  }): Promise<{
    leave: LeaveWithEmployee;
    result: LeaveWorkflowReviewResult;
  }> {
    const existing = await teamRepository.getLeave(input.leaveId);
    if (!existing) {
      throw new TeamError(
        "Leave request not found",
        404,
        TEAM_ERROR_CODES.NOT_FOUND,
      );
    }

    const subjectUserId = existing.employee?.userId ?? null;
    assertEmployeeCannotApprove(input.actor, subjectUserId);

    if (subjectUserId) {
      await sodPolicyService.assertLeaveReview(
        toSodActor(input.actor),
        subjectUserId,
        input.decision,
        input.leaveId,
      );
    }

    let stage = await resolveStage(existing);
    if (
      stage.state === "FINAL_APPROVED" ||
      stage.state === "FINAL_REJECTED" ||
      stage.state === "MANAGER_REJECTED" ||
      stage.state === "HR_REJECTED" ||
      stage.state === "CANCELLED" ||
      stage.state === "EXPIRED" ||
      existing.status !== "PENDING"
    ) {
      throw new TeamError(
        "Leave request already reviewed",
        409,
        TEAM_ERROR_CODES.CONFLICT,
      );
    }

    if (Date.parse(stage.expiresAt) < Date.now()) {
      await this.expireLeave(existing, stage, "auto");
      throw new TeamError(
        "Leave request has expired",
        409,
        TEAM_ERROR_CODES.CONFLICT,
      );
    }

    const config = getLeaveApprovalConfig();
    const isManager = await isManagerOfEmployee(input.actor, existing.employee);
    const hr = isHrActor(input.actor);
    const override = isSuperAdmin(input.actor);

    if (input.decision === "REJECTED") {
      return this.applyRejection({
        leave: existing,
        stage,
        actor: input.actor,
        reviewNote: input.reviewNote ?? null,
        isManager,
        hr,
        override,
        config,
      });
    }

    return this.applyApproval({
      leave: existing,
      stage,
      actor: input.actor,
      reviewNote: input.reviewNote ?? null,
      isManager,
      hr,
      override,
      config,
    });
  }

  private async applyApproval(input: {
    leave: LeaveWithEmployee;
    stage: LeaveWorkflowStageRecord;
    actor: LeaveWorkflowActor;
    reviewNote: string | null;
    isManager: boolean;
    hr: boolean;
    override: boolean;
    config: ReturnType<typeof getLeaveApprovalConfig>;
  }): Promise<{ leave: LeaveWithEmployee; result: LeaveWorkflowReviewResult }> {
    const { leave, actor, config } = input;
    let stage = { ...input.stage };
    let overridden = false;
    const now = new Date().toISOString();

    const needsManager =
      config.managerApprovalRequired &&
      Boolean(leave.employee?.managerId || leave.employee?.primaryTeamId) &&
      stage.state === "SUBMITTED";

    const needsFinal =
      stage.state === "HR_APPROVED" ||
      (stage.state === "MANAGER_APPROVED" && !config.hrApprovalRequired) ||
      (stage.state === "SUBMITTED" &&
        !config.managerApprovalRequired &&
        !config.hrApprovalRequired);

    // Super Admin override — force final approval from any in-progress stage.
    if (
      input.override &&
      !input.isManager &&
      stage.state === "SUBMITTED" &&
      needsManager
    ) {
      overridden = true;
      stage = {
        ...stage,
        state: "FINAL_APPROVED",
        overrideById: actor.userId,
        overrideAt: now,
        overrideAction: "APPROVE",
        finalApproverId: actor.userId,
        finalApprovedAt: now,
        updatedAt: now,
      };
    } else if (stage.state === "SUBMITTED" && needsManager) {
      if (!input.isManager && !input.override) {
        throw new TeamError(
          "Manager approval is required before HR review",
          403,
          TEAM_ERROR_CODES.FORBIDDEN,
        );
      }
      if (input.isManager) {
        stage = {
          ...stage,
          state: "MANAGER_APPROVED",
          managerApproverId: actor.userId,
          managerApprovedAt: now,
          updatedAt: now,
        };
        if (!config.hrApprovalRequired) {
          stage = {
            ...stage,
            state: "FINAL_APPROVED",
            finalApproverId: actor.userId,
            finalApprovedAt: now,
            updatedAt: now,
          };
        }
      } else if (input.override) {
        overridden = true;
        stage = {
          ...stage,
          state: "FINAL_APPROVED",
          overrideById: actor.userId,
          overrideAt: now,
          overrideAction: "APPROVE",
          finalApproverId: actor.userId,
          finalApprovedAt: now,
          updatedAt: now,
        };
      }
    } else if (
      stage.state === "SUBMITTED" &&
      !needsManager &&
      config.hrApprovalRequired
    ) {
      if (!input.hr && !input.override) {
        throw new TeamError(
          "HR approval is required",
          403,
          TEAM_ERROR_CODES.FORBIDDEN,
        );
      }
      stage = {
        ...stage,
        state: "HR_APPROVED",
        hrApproverId: actor.userId,
        hrApprovedAt: now,
        updatedAt: now,
      };
    } else if (
      stage.state === "SUBMITTED" &&
      !needsManager &&
      !config.hrApprovalRequired
    ) {
      if (!input.hr && !input.override) {
        throw new TeamError(
          "Approval requires Admin authority",
          403,
          TEAM_ERROR_CODES.FORBIDDEN,
        );
      }
      stage = {
        ...stage,
        state: "FINAL_APPROVED",
        finalApproverId: actor.userId,
        finalApprovedAt: now,
        updatedAt: now,
      };
    } else if (stage.state === "MANAGER_APPROVED") {
      if (config.hrApprovalRequired) {
        if (!input.hr && !input.override) {
          throw new TeamError(
            "HR must review after manager approval",
            403,
            TEAM_ERROR_CODES.FORBIDDEN,
          );
        }
        if (
          stage.managerApproverId &&
          stage.managerApproverId === actor.userId &&
          !input.override
        ) {
          throw new TeamError(
            "Manager cannot also perform HR approval",
            403,
            TEAM_ERROR_CODES.FORBIDDEN,
          );
        }
        if (input.override && !input.hr) {
          overridden = true;
          stage = {
            ...stage,
            state: "FINAL_APPROVED",
            overrideById: actor.userId,
            overrideAt: now,
            overrideAction: "APPROVE",
            finalApproverId: actor.userId,
            finalApprovedAt: now,
            updatedAt: now,
          };
        } else {
          stage = {
            ...stage,
            state: "HR_APPROVED",
            hrApproverId: actor.userId,
            hrApprovedAt: now,
            updatedAt: now,
          };
        }
      } else {
        if (!input.hr && !input.override) {
          throw new TeamError(
            "Final approval requires HR or Admin",
            403,
            TEAM_ERROR_CODES.FORBIDDEN,
          );
        }
        stage = {
          ...stage,
          state: "FINAL_APPROVED",
          finalApproverId: actor.userId,
          finalApprovedAt: now,
          updatedAt: now,
        };
      }
    } else if (stage.state === "HR_APPROVED" || needsFinal) {
      if (!input.hr && !input.override) {
        throw new TeamError(
          "Final approval requires Admin authority",
          403,
          TEAM_ERROR_CODES.FORBIDDEN,
        );
      }
      stage = {
        ...stage,
        state: "FINAL_APPROVED",
        finalApproverId: actor.userId,
        finalApprovedAt: now,
        updatedAt: now,
        ...(input.override
          ? {
              overrideById: actor.userId,
              overrideAt: now,
              overrideAction: "APPROVE" as const,
            }
          : {}),
      };
      if (input.override) overridden = true;
    } else {
      throw new TeamError(
        "Leave request is not awaiting approval",
        409,
        TEAM_ERROR_CODES.CONFLICT,
      );
    }

    // HR approval auto-advances to final when HR is the last required human gate
    // and the actor is Admin (Final stage completes in the same decision).
    if (stage.state === "HR_APPROVED" && input.hr) {
      await writeTimeline({
        employeeId: leave.employeeId,
        eventType: LEAVE_TIMELINE_EVENTS.HR_APPROVED,
        title: "Leave HR approved",
        description: leave.type,
        actedById: actor.userId,
      });
      await writeWorkflowAudit({
        actor,
        action: LEAVE_WORKFLOW_AUDIT.HR_APPROVE,
        leaveId: leave.id,
        type: leave.type,
        metadata: { workflowState: "HR_APPROVED" },
      });
      stage = {
        ...stage,
        state: "FINAL_APPROVED",
        finalApproverId: actor.userId,
        finalApprovedAt: now,
        updatedAt: now,
      };
    }

    const finalized = stage.state === "FINAL_APPROVED";
    const persistedStatus = finalized ? "APPROVED" : "PENDING";

    const updatedLeave = finalized
      ? await teamRepository.reviewLeave(leave.id, {
          status: "APPROVED",
          reviewNote: input.reviewNote,
          reviewedById: actor.userId,
        })
      : ((await prisma.leaveRequest.update({
          where: { id: leave.id },
          data: {
            reviewNote: input.reviewNote,
            updatedById: actor.userId,
          },
          include: { employee: { include: employeeIncludeForLeave } },
        })) as LeaveWithEmployee);

    await persistStage(stage);

    const enterpriseType = resolveEnterpriseLeaveType(
      updatedLeave.type,
      updatedLeave.reason,
    );
    const holidayDates = await loadHolidayDateKeys(
      updatedLeave.startDate,
      updatedLeave.endDate,
    );
    const balance = validateLeaveBalance({
      type: updatedLeave.type,
      reason: updatedLeave.reason,
      start: updatedLeave.startDate,
      end: updatedLeave.endDate,
      holidayDates,
      balances: {
        annualLeaveBalance: updatedLeave.employee?.annualLeaveBalance ?? 0,
        casualLeaveBalance: updatedLeave.employee?.casualLeaveBalance ?? 0,
        sickLeaveBalance: updatedLeave.employee?.sickLeaveBalance ?? 0,
        medicalLeaveBalance: updatedLeave.employee?.medicalLeaveBalance ?? 0,
      },
    });

    if (stage.state === "MANAGER_APPROVED") {
      await writeTimeline({
        employeeId: updatedLeave.employeeId,
        eventType: LEAVE_TIMELINE_EVENTS.MANAGER_APPROVED,
        title: "Leave manager approved",
        description: updatedLeave.type,
        actedById: actor.userId,
      });
      await writeWorkflowAudit({
        actor,
        action: LEAVE_WORKFLOW_AUDIT.MANAGER_APPROVE,
        leaveId: updatedLeave.id,
        type: updatedLeave.type,
        metadata: { workflowState: stage.state },
      });
      await notifyStakeholders({
        leaveId: updatedLeave.id,
        type: updatedLeave.type,
        employeeUserId: updatedLeave.employee?.userId ?? stage.subjectUserId,
        managerUserId: updatedLeave.employee?.managerId,
        title: "Leave manager approved",
        body: "Your leave request was approved by your manager and awaits HR review.",
        createdById: actor.userId,
        includeHr: true,
      });
    } else if (finalized) {
      if (overridden) {
        await writeTimeline({
          employeeId: updatedLeave.employeeId,
          eventType: LEAVE_TIMELINE_EVENTS.OVERRIDE,
          title: "Leave force-approved",
          description: updatedLeave.type,
          actedById: actor.userId,
        });
        await writeWorkflowAudit({
          actor,
          action: LEAVE_WORKFLOW_AUDIT.OVERRIDE,
          leaveId: updatedLeave.id,
          type: updatedLeave.type,
          metadata: {
            workflowState: stage.state,
            overrideAction: "APPROVE",
          },
        });
      }

      await writeTimeline({
        employeeId: updatedLeave.employeeId,
        eventType: LEAVE_TIMELINE_EVENTS.FINAL_APPROVED,
        title: "Leave approved",
        description: `${updatedLeave.type} leave · ${balance.billableDays} day(s)`,
        actedById: actor.userId,
      });
      await writeWorkflowAudit({
        actor,
        action: LEAVE_WORKFLOW_AUDIT.FINAL_APPROVE,
        leaveId: updatedLeave.id,
        type: updatedLeave.type,
        metadata: {
          workflowState: stage.state,
          billableDays: balance.billableDays,
          overridden,
        },
      });

      await applyFinalSideEffects({
        leave: updatedLeave,
        actor,
        billableDays: balance.billableDays,
        enterpriseType,
      });

      await notifyStakeholders({
        leaveId: updatedLeave.id,
        type: updatedLeave.type,
        employeeUserId: updatedLeave.employee?.userId ?? stage.subjectUserId,
        managerUserId: updatedLeave.employee?.managerId,
        finalApproverId: actor.userId,
        title: overridden ? "Leave force-approved" : "Leave approved",
        body: `Your ${updatedLeave.type.toLowerCase()} leave request was approved.`,
        createdById: actor.userId,
        includeHr: true,
      });
    }

    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.LEAVE_REVIEW,
      resourceId: updatedLeave.id,
      metadata: safeAuditMetadata(updatedLeave.type, {
        status: persistedStatus,
        workflowState: stage.state,
        overridden,
      }),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      leave: updatedLeave,
      result: {
        persistedStatus,
        workflowState: stage.state,
        finalized,
        overridden,
        reviewNote: input.reviewNote,
        stageRecord: stage,
      },
    };
  }

  private async applyRejection(input: {
    leave: LeaveWithEmployee;
    stage: LeaveWorkflowStageRecord;
    actor: LeaveWorkflowActor;
    reviewNote: string | null;
    isManager: boolean;
    hr: boolean;
    override: boolean;
    config: ReturnType<typeof getLeaveApprovalConfig>;
  }): Promise<{ leave: LeaveWithEmployee; result: LeaveWorkflowReviewResult }> {
    const { leave, actor, config } = input;
    const now = new Date().toISOString();
    let workflowState: LeaveWorkflowState = "FINAL_REJECTED";
    let overridden = false;

    if (input.override && !input.isManager && !input.hr) {
      overridden = true;
      workflowState = "FINAL_REJECTED";
    } else if (input.stage.state === "SUBMITTED") {
      if (config.managerApprovalRequired && input.isManager) {
        workflowState = "MANAGER_REJECTED";
      } else if (input.hr || input.override) {
        workflowState = input.override ? "FINAL_REJECTED" : "HR_REJECTED";
        overridden = input.override && !input.hr;
      } else if (input.isManager) {
        workflowState = "MANAGER_REJECTED";
      } else {
        throw new TeamError(
          "Not authorized to reject this leave request",
          403,
          TEAM_ERROR_CODES.FORBIDDEN,
        );
      }
    } else if (input.stage.state === "MANAGER_APPROVED") {
      if (!input.hr && !input.override) {
        throw new TeamError(
          "HR must review after manager approval",
          403,
          TEAM_ERROR_CODES.FORBIDDEN,
        );
      }
      workflowState = input.override && !input.hr ? "FINAL_REJECTED" : "HR_REJECTED";
      overridden = input.override && !input.hr;
    } else if (input.stage.state === "HR_APPROVED") {
      if (!input.hr && !input.override) {
        throw new TeamError(
          "Final rejection requires Admin authority",
          403,
          TEAM_ERROR_CODES.FORBIDDEN,
        );
      }
      workflowState = "FINAL_REJECTED";
      overridden = input.override;
    } else {
      throw new TeamError(
        "Leave request is not awaiting review",
        409,
        TEAM_ERROR_CODES.CONFLICT,
      );
    }

    // Managers may only reject their own team.
    if (workflowState === "MANAGER_REJECTED" && !input.isManager && !input.override) {
      throw new TeamError(
        "Manager can reject only their own team",
        403,
        TEAM_ERROR_CODES.FORBIDDEN,
      );
    }
    if (
      input.stage.state === "SUBMITTED" &&
      config.managerApprovalRequired &&
      input.isManager === false &&
      !input.hr &&
      !input.override
    ) {
      throw new TeamError(
        "Manager can approve only their own team",
        403,
        TEAM_ERROR_CODES.FORBIDDEN,
      );
    }

    const stage: LeaveWorkflowStageRecord = {
      ...input.stage,
      state: workflowState,
      updatedAt: now,
      ...(overridden
        ? {
            overrideById: actor.userId,
            overrideAt: now,
            overrideAction: "REJECT" as const,
          }
        : {}),
    };

    const updated = await teamRepository.reviewLeave(leave.id, {
      status: "REJECTED",
      reviewNote: input.reviewNote,
      reviewedById: actor.userId,
    });
    await persistStage(stage);

    const timelineType =
      workflowState === "MANAGER_REJECTED"
        ? LEAVE_TIMELINE_EVENTS.MANAGER_REJECTED
        : workflowState === "HR_REJECTED"
          ? LEAVE_TIMELINE_EVENTS.HR_REJECTED
          : LEAVE_TIMELINE_EVENTS.FINAL_REJECTED;

    await writeTimeline({
      employeeId: leave.employeeId,
      eventType: overridden
        ? LEAVE_TIMELINE_EVENTS.OVERRIDE
        : timelineType,
      title: overridden ? "Leave force-rejected" : "Leave rejected",
      description: leave.type,
      actedById: actor.userId,
    });

    const auditAction = overridden
      ? LEAVE_WORKFLOW_AUDIT.OVERRIDE
      : workflowState === "MANAGER_REJECTED"
        ? LEAVE_WORKFLOW_AUDIT.MANAGER_REJECT
        : workflowState === "HR_REJECTED"
          ? LEAVE_WORKFLOW_AUDIT.HR_REJECT
          : LEAVE_WORKFLOW_AUDIT.FINAL_REJECT;

    await writeWorkflowAudit({
      actor,
      action: auditAction,
      leaveId: leave.id,
      type: leave.type,
      metadata: {
        workflowState,
        overrideAction: overridden ? "REJECT" : undefined,
      },
    });

    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.LEAVE_REVIEW,
      resourceId: leave.id,
      metadata: safeAuditMetadata(leave.type, {
        status: "REJECTED",
        workflowState,
        overridden,
      }),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    await notifyStakeholders({
      leaveId: leave.id,
      type: leave.type,
      employeeUserId: leave.employee?.userId ?? stage.subjectUserId,
      managerUserId: leave.employee?.managerId,
      finalApproverId: actor.userId,
      title: overridden ? "Leave force-rejected" : "Leave rejected",
      body: `Your ${leave.type.toLowerCase()} leave request was rejected.`,
      createdById: actor.userId,
      includeHr: true,
    });

    return {
      leave: updated,
      result: {
        persistedStatus: "REJECTED",
        workflowState,
        finalized: false,
        overridden,
        reviewNote: input.reviewNote,
        stageRecord: stage,
      },
    };
  }

  private async expireLeave(
    leave: LeaveWithEmployee,
    stage: LeaveWorkflowStageRecord,
    triggeredBy: "auto" | "job",
  ): Promise<void> {
    if (leave.status !== "PENDING") return;

    const now = new Date().toISOString();
    const next: LeaveWorkflowStageRecord = {
      ...stage,
      state: "EXPIRED",
      updatedAt: now,
    };

    await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: {
        status: "CANCELLED",
        reviewNote: leave.reviewNote ?? "Expired by leave workflow policy",
        reviewedAt: new Date(),
      },
    });

    await persistStage(next);
    await writeTimeline({
      employeeId: leave.employeeId,
      eventType: LEAVE_TIMELINE_EVENTS.EXPIRED,
      title: "Leave expired",
      description: leave.type,
      actedById: null,
    });
    await writeWorkflowAudit({
      actor: null,
      action: LEAVE_WORKFLOW_AUDIT.EXPIRE,
      leaveId: leave.id,
      type: leave.type,
      metadata: { triggeredBy, workflowState: "EXPIRED" },
    });

    if (leave.employee?.userId) {
      await notifyStakeholders({
        leaveId: leave.id,
        type: leave.type,
        employeeUserId: leave.employee.userId,
        managerUserId: leave.employee.managerId,
        title: "Leave request expired",
        body: `Your ${leave.type.toLowerCase()} leave request expired without final approval.`,
        includeHr: true,
      });
    }
  }

  /** Expire PENDING leaves past LEAVE_AUTO_EXPIRE_DAYS. */
  async expireStaleLeaves(): Promise<{ expired: number }> {
    const config = getLeaveApprovalConfig();
    const cutoff = new Date(
      Date.now() - config.autoExpireDays * 86_400_000,
    );

    const pending = await prisma.leaveRequest.findMany({
      where: {
        deletedAt: null,
        status: "PENDING",
        createdAt: { lte: cutoff },
      },
      include: { employee: { include: employeeIncludeForLeave } },
      take: 200,
    });

    let expired = 0;
    for (const leave of pending) {
      const stage = await resolveStage(leave);
      await this.expireLeave(leave, stage, "job");
      expired += 1;
    }

    // Expire durable DB stages past expiresAt (works across restarts / multi-instance).
    for (const stage of await listExpiredInProgressLeaveWorkflowStages()) {
      const leave = await teamRepository.getLeave(stage.leaveId);
      if (leave && leave.status === "PENDING") {
        await this.expireLeave(leave, stage, "job");
        expired += 1;
      } else {
        await deleteLeaveWorkflowStage(stage.leaveId);
      }
    }

    return { expired };
  }
}

export const leaveApprovalWorkflowService = new LeaveApprovalWorkflowService();
