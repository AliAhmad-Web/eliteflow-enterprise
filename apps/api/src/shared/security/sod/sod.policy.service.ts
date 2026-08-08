import { writeAuditLogSafe } from "../write-audit-log.js";
import { securityMonitoringService } from "../monitoring/index.js";
import {
  SOD_AUDIT_ACTIONS,
  SodPolicyError,
  SodProtectedAction,
  isElevatedRole,
  type SodActorContext,
  type SodAuditAction,
  type SodDenialContext,
  type SodProtectedActionCode,
} from "./sod.types.js";

function sameActor(
  actorUserId: string,
  subjectUserId: string | null | undefined,
): boolean {
  if (!subjectUserId) return false;
  return actorUserId === subjectUserId;
}

/**
 * Centralized Separation of Duties (SoD) policy service.
 * Business modules must call these helpers — do not duplicate rules.
 */
export class SodPolicyService {
  /**
   * Persist SoD denial audit and throw a generic 403 (no policy details leaked).
   */
  async deny(input: SodDenialContext & { auditAction: SodAuditAction }): Promise<never> {
    await writeAuditLogSafe(
      {
        userId: input.actor.userId,
        action: input.auditAction,
        resource: input.resource ?? "sod",
        resourceId: input.resourceId ?? null,
        metadata: {
          sodAction: input.action,
          subjectUserId: input.subjectUserId ?? null,
          actorRole: input.actor.role ?? null,
          ...(input.metadata ?? {}),
        },
        ipAddress: input.actor.ipAddress ?? null,
        userAgent: input.actor.userAgent ?? null,
      },
      "sod",
    );

    void securityMonitoringService.reportSodViolation({
      userId: input.actor.userId,
      resource: input.resource ?? "sod",
      resourceId: input.resourceId ?? null,
      message: "Separation of duties violation blocked",
      metadata: {
        sodAction: input.action,
        auditAction: input.auditAction,
      },
      ipAddress: input.actor.ipAddress ?? null,
      userAgent: input.actor.userAgent ?? null,
    });

    throw new SodPolicyError(input.auditAction);
  }

  /** Approver / reviewer must differ from the subject (request owner). */
  async assertDifferentActors(
    actor: SodActorContext,
    subjectUserId: string,
    options: {
      action: SodProtectedActionCode;
      resource?: string;
      resourceId?: string | null;
      auditAction?: SodAuditAction;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    if (!sameActor(actor.userId, subjectUserId)) {
      return;
    }

    await this.deny({
      actor,
      subjectUserId,
      action: options.action,
      resource: options.resource,
      resourceId: options.resourceId,
      metadata: options.metadata,
      auditAction:
        options.auditAction ?? SOD_AUDIT_ACTIONS.DIFFERENT_ACTOR_REQUIRED,
    });
  }

  /** Creator / subject cannot approve their own request. */
  async assertNoSelfApproval(
    actor: SodActorContext,
    subjectUserId: string,
    options: {
      action: SodProtectedActionCode;
      resource?: string;
      resourceId?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.assertDifferentActors(actor, subjectUserId, {
      ...options,
      auditAction: SOD_AUDIT_ACTIONS.SELF_APPROVAL_BLOCKED,
    });
  }

  /**
   * Governance approval gate — approver must be a different actor than the subject.
   */
  async assertCanApprove(
    actor: SodActorContext,
    subjectUserId: string,
    options: {
      action: SodProtectedActionCode;
      resource?: string;
      resourceId?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.assertNoSelfApproval(actor, subjectUserId, options);
  }

  /** User cannot elevate / promote themselves into privileged standing. */
  async assertNoSelfElevation(
    actor: SodActorContext,
    subjectUserId: string,
    options: {
      action: SodProtectedActionCode;
      resource?: string;
      resourceId?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    if (!sameActor(actor.userId, subjectUserId)) {
      return;
    }

    await this.deny({
      actor,
      subjectUserId,
      action: options.action,
      resource: options.resource,
      resourceId: options.resourceId,
      metadata: options.metadata,
      auditAction: SOD_AUDIT_ACTIONS.SELF_ROLE_ESCALATION_BLOCKED,
    });
  }

  /**
   * Protected role transitions:
   * - cannot assign elevated roles to self
   * - cannot remove own Super Admin role
   */
  async assertProtectedRoleChange(
    actor: SodActorContext,
    input: {
      subjectUserId: string;
      newRoleCode: string;
      currentRoleCode?: string | null;
      resource?: string;
      resourceId?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    const isSelf = sameActor(actor.userId, input.subjectUserId);

    if (
      isSelf &&
      input.currentRoleCode === "SUPER_ADMIN" &&
      input.newRoleCode !== "SUPER_ADMIN"
    ) {
      await this.deny({
        actor,
        subjectUserId: input.subjectUserId,
        action: SodProtectedAction.ROLE_ASSIGN,
        resource: input.resource ?? "identity",
        resourceId: input.resourceId,
        metadata: {
          ...input.metadata,
          currentRoleCode: input.currentRoleCode,
          newRoleCode: input.newRoleCode,
        },
        auditAction: SOD_AUDIT_ACTIONS.PROTECTED_ROLE_CHANGE_BLOCKED,
      });
    }

    if (isSelf && isElevatedRole(input.newRoleCode)) {
      await this.deny({
        actor,
        subjectUserId: input.subjectUserId,
        action: SodProtectedAction.ROLE_ELEVATE,
        resource: input.resource ?? "identity",
        resourceId: input.resourceId,
        metadata: {
          ...input.metadata,
          newRoleCode: input.newRoleCode,
        },
        auditAction: SOD_AUDIT_ACTIONS.SELF_ROLE_ESCALATION_BLOCKED,
      });
    }
  }

  // ── Domain convenience gates (call sites stay thin) ─────────────────────

  async assertLeaveReview(
    actor: SodActorContext,
    subjectUserId: string,
    status: "APPROVED" | "REJECTED" | "CANCELLED",
    resourceId?: string,
  ): Promise<void> {
    let action: SodProtectedActionCode = SodProtectedAction.LEAVE_APPROVE;
    switch (status) {
      case "APPROVED":
        action = SodProtectedAction.LEAVE_APPROVE;
        break;
      case "REJECTED":
        action = SodProtectedAction.LEAVE_REJECT;
        break;
      case "CANCELLED":
        action = SodProtectedAction.LEAVE_CANCEL;
        break;
      default: {
        const exhaustive: never = status;
        return exhaustive;
      }
    }

    await this.assertCanApprove(actor, subjectUserId, {
      action,
      resource: "team",
      resourceId: resourceId ?? null,
      metadata: { leaveStatus: status },
    });
  }

  async assertSalaryMutation(
    actor: SodActorContext,
    subjectUserId: string,
    kind: "create" | "update",
    resourceId?: string,
  ): Promise<void> {
    if (!sameActor(actor.userId, subjectUserId)) {
      return;
    }

    await this.deny({
      actor,
      subjectUserId,
      action:
        kind === "create"
          ? SodProtectedAction.SALARY_CREATE
          : SodProtectedAction.SALARY_UPDATE,
      resource: "team",
      resourceId: resourceId ?? null,
      auditAction: SOD_AUDIT_ACTIONS.SELF_SALARY_BLOCKED,
    });
  }

  async assertTermination(
    actor: SodActorContext,
    subjectUserId: string,
    resourceId?: string,
  ): Promise<void> {
    if (!sameActor(actor.userId, subjectUserId)) {
      return;
    }

    await this.deny({
      actor,
      subjectUserId,
      action: SodProtectedAction.EMPLOYEE_TERMINATE,
      resource: "team",
      resourceId: resourceId ?? null,
      auditAction: SOD_AUDIT_ACTIONS.SELF_TERMINATION_BLOCKED,
    });
  }

  async assertPromotion(
    actor: SodActorContext,
    subjectUserId: string,
    options?: {
      affectsCompensation?: boolean;
      resourceId?: string;
    },
  ): Promise<void> {
    if (!sameActor(actor.userId, subjectUserId)) {
      return;
    }

    await this.deny({
      actor,
      subjectUserId,
      action: SodProtectedAction.EMPLOYEE_PROMOTE,
      resource: "team",
      resourceId: options?.resourceId ?? null,
      metadata: {
        affectsCompensation: Boolean(options?.affectsCompensation),
      },
      auditAction: SOD_AUDIT_ACTIONS.SELF_PROMOTION_BLOCKED,
    });
  }

  async assertDepartmentHeadAssignment(
    actor: SodActorContext,
    headUserId: string,
    resourceId?: string,
  ): Promise<void> {
    if (!sameActor(actor.userId, headUserId)) {
      return;
    }

    await this.deny({
      actor,
      subjectUserId: headUserId,
      action: SodProtectedAction.DEPT_HEAD_ASSIGN,
      resource: "team",
      resourceId: resourceId ?? null,
      auditAction: SOD_AUDIT_ACTIONS.SELF_DEPT_HEAD_BLOCKED,
    });
  }

  async assertAdminDeletion(
    actor: SodActorContext,
    subjectUserId: string,
    resourceId?: string,
  ): Promise<void> {
    await this.assertDifferentActors(actor, subjectUserId, {
      action: SodProtectedAction.ADMIN_DELETE,
      resource: "team",
      resourceId: resourceId ?? null,
      auditAction: SOD_AUDIT_ACTIONS.SELF_TERMINATION_BLOCKED,
    });
  }

  /**
   * Future-ready finance dual-control gate (payroll / invoice / budget approval).
   * Safe to call from finance modules when workflows are introduced.
   */
  async assertFinanceApproval(
    actor: SodActorContext,
    subjectUserId: string,
    kind: "payroll" | "invoice" | "budget",
    resourceId?: string,
  ): Promise<void> {
    let action: SodProtectedActionCode = SodProtectedAction.INVOICE_APPROVE;
    switch (kind) {
      case "payroll":
        action = SodProtectedAction.PAYROLL_APPROVE;
        break;
      case "invoice":
        action = SodProtectedAction.INVOICE_APPROVE;
        break;
      case "budget":
        action = SodProtectedAction.BUDGET_APPROVE;
        break;
      default: {
        const exhaustive: never = kind;
        return exhaustive;
      }
    }

    if (!sameActor(actor.userId, subjectUserId)) {
      return;
    }

    await this.deny({
      actor,
      subjectUserId,
      action,
      resource: "finance",
      resourceId: resourceId ?? null,
      metadata: { financeKind: kind },
      auditAction: SOD_AUDIT_ACTIONS.FINANCE_SELF_APPROVAL_BLOCKED,
    });
  }
}

export const sodPolicyService = new SodPolicyService();
