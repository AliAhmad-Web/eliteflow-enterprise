import { AppError } from "../../errors/app-error.js";

/** Client-facing message — never expose internal SoD policy details. */
export const SOD_CLIENT_MESSAGE = "This action is not permitted." as const;

export const SOD_ERROR_CODE = "AUTH_FORBIDDEN" as const;

/**
 * Audit action codes for SoD denials (persisted as AuditLog.action).
 * Keep stable for SIEM / compliance queries.
 */
export const SOD_AUDIT_ACTIONS = {
  SELF_APPROVAL_BLOCKED: "SOD_SELF_APPROVAL_BLOCKED",
  SELF_ROLE_ESCALATION_BLOCKED: "SOD_SELF_ROLE_ESCALATION_BLOCKED",
  SELF_SALARY_BLOCKED: "SOD_SELF_SALARY_BLOCKED",
  SELF_TERMINATION_BLOCKED: "SOD_SELF_TERMINATION_BLOCKED",
  SELF_PROMOTION_BLOCKED: "SOD_SELF_PROMOTION_BLOCKED",
  SELF_DEPT_HEAD_BLOCKED: "SOD_SELF_DEPT_HEAD_BLOCKED",
  DIFFERENT_ACTOR_REQUIRED: "SOD_DIFFERENT_ACTOR_REQUIRED",
  PROTECTED_ROLE_CHANGE_BLOCKED: "SOD_PROTECTED_ROLE_CHANGE_BLOCKED",
  FINANCE_SELF_APPROVAL_BLOCKED: "SOD_FINANCE_SELF_APPROVAL_BLOCKED",
} as const;

export type SodAuditAction =
  (typeof SOD_AUDIT_ACTIONS)[keyof typeof SOD_AUDIT_ACTIONS];

/** Logical protected operations covered by enterprise SoD. */
export const SodProtectedAction = {
  EMPLOYEE_HIRE: "hr.employee.hire",
  EMPLOYEE_TERMINATE: "hr.employee.terminate",
  SALARY_CREATE: "hr.salary.create",
  SALARY_UPDATE: "hr.salary.update",
  EMPLOYEE_PROMOTE: "hr.employee.promote",
  DEPT_HEAD_ASSIGN: "hr.department.head.assign",
  ROLE_ASSIGN: "identity.role.assign",
  ROLE_ELEVATE: "identity.role.elevate",
  ADMIN_CREATE: "identity.admin.create",
  ADMIN_DELETE: "identity.admin.delete",
  PERMISSION_ASSIGN: "identity.permission.assign",
  LEAVE_APPROVE: "leave.approve",
  LEAVE_REJECT: "leave.reject",
  LEAVE_CANCEL: "leave.cancel",
  PAYROLL_APPROVE: "finance.payroll.approve",
  INVOICE_APPROVE: "finance.invoice.approve",
  BUDGET_APPROVE: "finance.budget.approve",
} as const;

export type SodProtectedActionCode =
  (typeof SodProtectedAction)[keyof typeof SodProtectedAction];

export const SOD_ELEVATED_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
] as const;

export type SodElevatedRole = (typeof SOD_ELEVATED_ROLES)[number];

export interface SodActorContext {
  userId: string;
  role?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface SodDenialContext {
  actor: SodActorContext;
  subjectUserId?: string | null;
  action: SodProtectedActionCode;
  resource?: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

export class SodPolicyError extends AppError {
  readonly sodAuditAction: SodAuditAction;

  constructor(sodAuditAction: SodAuditAction) {
    super(SOD_CLIENT_MESSAGE, 403, SOD_ERROR_CODE);
    this.sodAuditAction = sodAuditAction;
  }
}

export function isElevatedRole(roleCode: string | null | undefined): boolean {
  if (!roleCode) return false;
  return (SOD_ELEVATED_ROLES as readonly string[]).includes(roleCode);
}
