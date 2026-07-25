import { prisma, Prisma } from "@enterprise/database";

interface ProjectAuditInput {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logProjectAuditEvent(
  input: ProjectAuditInput,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        resource: "project",
        resourceId: input.resourceId ?? null,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("[projects] Failed to write audit log:", error);
  }
}

export const PROJECT_AUDIT_ACTIONS = {
  CREATE: "project.create",
  UPDATE: "project.update",
  DELETE: "project.delete",
} as const;
