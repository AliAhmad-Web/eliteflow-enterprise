import { prisma, Prisma } from "@enterprise/database";

interface TeamAuditInput {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logTeamAuditEvent(input: TeamAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        resource: "team",
        resourceId: input.resourceId ?? null,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("[team] Failed to write audit log:", error);
  }
}

export const TEAM_AUDIT_ACTIONS = {
  DEPARTMENT_CREATE: "team.department.create",
  DEPARTMENT_UPDATE: "team.department.update",
  DEPARTMENT_DELETE: "team.department.delete",
  EMPLOYEE_CREATE: "team.employee.create",
  EMPLOYEE_UPDATE: "team.employee.update",
  EMPLOYEE_DELETE: "team.employee.delete",
  TEAM_CREATE: "team.team.create",
  TEAM_UPDATE: "team.team.update",
  TEAM_DELETE: "team.team.delete",
  ATTENDANCE_CHECK_IN: "team.attendance.check_in",
  ATTENDANCE_CHECK_OUT: "team.attendance.check_out",
  LEAVE_APPLY: "team.leave.apply",
  LEAVE_REVIEW: "team.leave.review",
  PERFORMANCE_CREATE: "team.performance.create",
  PERFORMANCE_UPDATE: "team.performance.update",
  GOAL_CREATE: "team.goal.create",
  GOAL_UPDATE: "team.goal.update",
  GOAL_DELETE: "team.goal.delete",
} as const;
