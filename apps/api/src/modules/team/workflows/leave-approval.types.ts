/**
 * Enterprise Leave Approval Workflow — types.
 * Workflow stages are internal; Prisma LeaveRequestStatus remains unchanged.
 */

import type { LeaveType } from "@enterprise/database";

/** Multi-stage approval states (internal workflow). */
export const LEAVE_WORKFLOW_STATES = [
  "DRAFT",
  "SUBMITTED",
  "MANAGER_APPROVED",
  "MANAGER_REJECTED",
  "HR_APPROVED",
  "HR_REJECTED",
  "FINAL_APPROVED",
  "FINAL_REJECTED",
  "CANCELLED",
  "EXPIRED",
] as const;

export type LeaveWorkflowState = (typeof LEAVE_WORKFLOW_STATES)[number];

/**
 * Enterprise leave categories supported by the workflow.
 * Mapped onto existing Prisma LeaveType without schema redesign.
 */
export const ENTERPRISE_LEAVE_TYPES = [
  "ANNUAL",
  "SICK",
  "EMERGENCY",
  "CASUAL",
  "MATERNITY",
  "PATERNITY",
  "UNPAID",
  "COMPENSATORY",
  "WORK_FROM_HOME",
  "CUSTOM",
] as const;

export type EnterpriseLeaveType = (typeof ENTERPRISE_LEAVE_TYPES)[number];

/** Prisma LeaveType → enterprise category (PERSONAL=Casual, OTHER=Custom family). */
export const PRISMA_TO_ENTERPRISE_LEAVE: Record<
  LeaveType,
  EnterpriseLeaveType
> = {
  ANNUAL: "ANNUAL",
  SICK: "SICK",
  PERSONAL: "CASUAL",
  UNPAID: "UNPAID",
  MATERNITY: "MATERNITY",
  PATERNITY: "PATERNITY",
  OTHER: "CUSTOM",
};

export type LeaveWorkflowActor = {
  userId: string;
  role: string;
  email: string;
  permissions: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type LeaveWorkflowStageRecord = {
  leaveId: string;
  employeeId: string;
  subjectUserId: string;
  state: LeaveWorkflowState;
  managerApproverId?: string | null;
  managerApprovedAt?: string | null;
  hrApproverId?: string | null;
  hrApprovedAt?: string | null;
  finalApproverId?: string | null;
  finalApprovedAt?: string | null;
  overrideById?: string | null;
  overrideAt?: string | null;
  overrideAction?: "APPROVE" | "REJECT" | null;
  submittedAt: string;
  expiresAt: string;
  updatedAt: string;
};

export type LeaveBalanceValidationResult = {
  ok: boolean;
  enterpriseType: EnterpriseLeaveType;
  requestedDays: number;
  billableDays: number;
  remainingBalance: number | null;
  errors: string[];
};

export type LeaveConflictKind =
  | "DUPLICATE_LEAVE"
  | "EXISTING_LEAVE_OVERLAP"
  | "ATTENDANCE_CONFLICT"
  | "SHIFT_CONFLICT"
  | "CALENDAR_CONFLICT"
  | "HOLIDAY_OVERLAP";

export type LeaveConflict = {
  kind: LeaveConflictKind;
  message: string;
  details?: Record<string, unknown>;
};

export type LeaveConflictDetectionResult = {
  ok: boolean;
  conflicts: LeaveConflict[];
};

export type LeaveReviewDecision =
  | "APPROVED"
  | "REJECTED";

export type LeaveWorkflowReviewResult = {
  /** Persisted Prisma status after this review step. */
  persistedStatus: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  workflowState: LeaveWorkflowState;
  /** True when leave reached FINAL_APPROVED and side-effects should run. */
  finalized: boolean;
  /** True when Super Admin forced a transition. */
  overridden: boolean;
  reviewNote: string | null;
  stageRecord: LeaveWorkflowStageRecord;
};

export type LeaveWorkflowSubmitResult = {
  workflowState: "SUBMITTED";
  billableDays: number;
  stageRecord: LeaveWorkflowStageRecord;
  conflicts: LeaveConflict[];
};

export const LEAVE_WORKFLOW_AUDIT = {
  SUBMIT: "team.leave.workflow.submit",
  MANAGER_APPROVE: "team.leave.workflow.manager_approve",
  MANAGER_REJECT: "team.leave.workflow.manager_reject",
  HR_APPROVE: "team.leave.workflow.hr_approve",
  HR_REJECT: "team.leave.workflow.hr_reject",
  FINAL_APPROVE: "team.leave.workflow.final_approve",
  FINAL_REJECT: "team.leave.workflow.final_reject",
  OVERRIDE: "team.leave.workflow.override",
  CANCEL: "team.leave.workflow.cancel",
  EXPIRE: "team.leave.workflow.expire",
  BALANCE_DENY: "team.leave.workflow.balance_deny",
  CONFLICT_DENY: "team.leave.workflow.conflict_deny",
} as const;

export type LeaveWorkflowAuditAction =
  (typeof LEAVE_WORKFLOW_AUDIT)[keyof typeof LEAVE_WORKFLOW_AUDIT];

export const LEAVE_TIMELINE_EVENTS = {
  SUBMITTED: "LEAVE_SUBMITTED",
  MANAGER_APPROVED: "LEAVE_MANAGER_APPROVED",
  MANAGER_REJECTED: "LEAVE_MANAGER_REJECTED",
  HR_APPROVED: "LEAVE_HR_APPROVED",
  HR_REJECTED: "LEAVE_HR_REJECTED",
  FINAL_APPROVED: "LEAVE_APPROVED",
  FINAL_REJECTED: "LEAVE_REJECTED",
  CANCELLED: "LEAVE_CANCELLED",
  EXPIRED: "LEAVE_EXPIRED",
  OVERRIDE: "LEAVE_OVERRIDE",
} as const;
