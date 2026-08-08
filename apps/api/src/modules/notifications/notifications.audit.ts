import { prisma } from "@enterprise/database";
import type { Prisma } from "@enterprise/database";
import { sanitizeAuditMetadata } from "@enterprise/shared";

export async function writeNotificationAudit(input: {
  notificationId?: string | null;
  userId?: string | null;
  action: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  const metadata =
    input.metadata &&
    typeof input.metadata === "object" &&
    !Array.isArray(input.metadata)
      ? sanitizeAuditMetadata(input.metadata as Record<string, unknown>)
      : undefined;

  await prisma.notificationAudit.create({
    data: {
      notificationId: input.notificationId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      metadata: metadata
        ? (metadata as Prisma.InputJsonValue)
        : undefined,
    },
  });
}
