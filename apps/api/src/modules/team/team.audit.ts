import { writeAuditLogSafe } from "../../shared/security/write-audit-log.js";

interface TeamAuditInput {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logTeamAuditEvent(input: TeamAuditInput): Promise<void> {
  await writeAuditLogSafe(
    {
      userId: input.userId ?? null,
      action: input.action,
      resource: "team",
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    "team",
  );
}

export const TEAM_AUDIT_ACTIONS = {
  DEPARTMENT_CREATE: "team.department.create",
  DEPARTMENT_UPDATE: "team.department.update",
  DEPARTMENT_DELETE: "team.department.delete",
  DEPARTMENT_ASSIGN: "team.department.assign_employees",
  EMPLOYEE_CREATE: "team.employee.create",
  EMPLOYEE_HIRE: "team.employee.hire",
  EMPLOYEE_UPDATE: "team.employee.update",
  EMPLOYEE_DELETE: "team.employee.delete",
  EMPLOYEE_RESET_CREDENTIALS: "team.employee.reset_credentials",
  EMPLOYEE_PROMOTION: "team.employee.promotion",
  EMPLOYEE_HR_TRANSFER: "team.employee.transfer",
  DOCUMENT_UPLOAD: "team.employee.document_upload",
  DOCUMENT_DELETE: "team.employee.document_delete",
  ADMIN_CREATE: "team.admin.create",
  TEAM_CREATE: "team.team.create",
  TEAM_UPDATE: "team.team.update",
  TEAM_DELETE: "team.team.delete",
  TEAM_MEMBER_ADD: "team.team.member_add",
  TEAM_MEMBER_REMOVE: "team.team.member_remove",
  TEAM_MEMBER_TRANSFER: "team.team.member_transfer",
  ROLE_CHANGED: "team.role.changed",
  ATTENDANCE_CHECK_IN: "team.attendance.check_in",
  ATTENDANCE_CHECK_OUT: "team.attendance.check_out",
  LEAVE_APPLY: "team.leave.apply",
  LEAVE_REVIEW: "team.leave.review",
  LEAVE_WORKFLOW_SUBMIT: "team.leave.workflow.submit",
  LEAVE_WORKFLOW_OVERRIDE: "team.leave.workflow.override",
  LEAVE_WORKFLOW_EXPIRE: "team.leave.workflow.expire",
  PERFORMANCE_CREATE: "team.performance.create",
  PERFORMANCE_UPDATE: "team.performance.update",
  PERFORMANCE_CONFIG_UPDATE: "team.performance.config_update",
  PERFORMANCE_RECALCULATE: "team.performance.recalculate",
  PERFORMANCE_MONTHLY_GENERATE: "team.performance.monthly_generate",
  PERFORMANCE_MONTHLY_APPROVE: "team.performance.monthly_approve",
  GOAL_CREATE: "team.goal.create",
  GOAL_UPDATE: "team.goal.update",
  GOAL_DELETE: "team.goal.delete",
} as const;
