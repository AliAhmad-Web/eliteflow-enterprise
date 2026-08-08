import { writeAuditLogSafe } from "../../shared/security/write-audit-log.js";

interface TaskAuditInput {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logTaskAuditEvent(input: TaskAuditInput): Promise<void> {
  await writeAuditLogSafe(
    {
      userId: input.userId ?? null,
      action: input.action,
      resource: "task",
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    "tasks",
  );
}

export const TASK_AUDIT_ACTIONS = {
  CREATE: "task.create",
  UPDATE: "task.update",
  DELETE: "task.delete",
  COMMENT: "task.comment",
} as const;
