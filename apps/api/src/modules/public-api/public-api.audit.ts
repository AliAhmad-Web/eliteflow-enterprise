import { writeAuditLogSafe } from "../../shared/security/write-audit-log.js";

export const PUBLIC_API_AUDIT_ACTIONS = {
  KEY_CREATED: "public_api.key_created",
  KEY_REVOKED: "public_api.key_revoked",
  READ_ME: "public_api.me.read",
  READ_CLIENTS: "public_api.clients.read",
  READ_CLIENT: "public_api.clients.get",
  READ_PROJECTS: "public_api.projects.read",
  READ_PROJECT: "public_api.projects.get",
  READ_TASKS: "public_api.tasks.read",
  READ_TASK: "public_api.tasks.get",
  READ_INVOICES: "public_api.invoices.read",
  READ_INVOICE: "public_api.invoices.get",
} as const;

export async function logPublicApiAuditEvent(input: {
  userId?: string | null;
  action: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await writeAuditLogSafe({
    userId: input.userId ?? null,
    action: input.action,
    resource: "public_api",
    resourceId: input.resourceId ?? null,
    metadata: input.metadata ?? {},
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });
}
