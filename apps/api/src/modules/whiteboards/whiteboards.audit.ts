import { writeAuditLogSafe } from "../../shared/security/write-audit-log.js";

export const WHITEBOARDS_AUDIT_ACTIONS = {
  CREATE: "whiteboards.create",
  UPDATE: "whiteboards.update",
  DELETE: "whiteboards.delete",
  DUPLICATE: "whiteboards.duplicate",
  RESTORE_VERSION: "whiteboards.restore_version",
  COMMENT_CREATE: "whiteboards.comment_create",
} as const;

export async function logWhiteboardAuditEvent(input: {
  userId?: string | null;
  action: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await writeAuditLogSafe(
    {
      userId: input.userId ?? null,
      action: input.action,
      resource: "whiteboards",
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    "whiteboards",
  );
}
