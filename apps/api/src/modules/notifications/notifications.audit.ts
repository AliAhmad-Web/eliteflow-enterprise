import { prisma } from "@enterprise/database";
import type { Prisma } from "@enterprise/database";

export async function writeNotificationAudit(input: {
  notificationId?: string | null;
  userId?: string | null;
  action: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.notificationAudit.create({
    data: {
      notificationId: input.notificationId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      metadata: input.metadata ?? undefined,
    },
  });
}
