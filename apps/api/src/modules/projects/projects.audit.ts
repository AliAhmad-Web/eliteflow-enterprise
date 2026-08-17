import { writeAuditLogSafe } from "../../shared/security/write-audit-log.js";

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
  await writeAuditLogSafe(
    {
      userId: input.userId ?? null,
      action: input.action,
      resource: "project",
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    "projects",
  );
}

export const PROJECT_AUDIT_ACTIONS = {
  CREATE: "project.create",
  UPDATE: "project.update",
  DELETE: "project.delete",
  REOPEN: "project.reopen",
  COMPLETE: "project.complete",
} as const;
