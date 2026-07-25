import { prisma } from "@enterprise/database";
import type { Prisma } from "@enterprise/database";

export async function writeCommunicationAudit(input: {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        resource: "communication",
        resourceId: input.resourceId ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("[communication] Failed to write audit log:", error);
  }
}
