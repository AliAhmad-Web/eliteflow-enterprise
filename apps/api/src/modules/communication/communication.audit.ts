import type { Prisma } from "@enterprise/database";

import { writeAuditLogSafe } from "../../shared/security/write-audit-log.js";

export async function writeCommunicationAudit(input: {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  const metadata =
    input.metadata &&
    typeof input.metadata === "object" &&
    !Array.isArray(input.metadata)
      ? (input.metadata as Record<string, unknown>)
      : undefined;

  await writeAuditLogSafe(
    {
      userId: input.userId ?? null,
      action: input.action,
      resource: "communication",
      resourceId: input.resourceId ?? null,
      metadata,
    },
    "communication",
  );
}
