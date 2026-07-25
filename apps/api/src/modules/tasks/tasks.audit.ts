import { prisma, Prisma } from "@enterprise/database";

interface TaskAuditInput {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logTaskAuditEvent(input: TaskAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        resource: "task",
        resourceId: input.resourceId ?? null,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("[tasks] Failed to write audit log:", error);
  }
}

export const TASK_AUDIT_ACTIONS = {
  CREATE: "task.create",
  UPDATE: "task.update",
  DELETE: "task.delete",
  COMMENT: "task.comment",
} as const;
