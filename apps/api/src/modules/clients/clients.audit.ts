import { writeAuditLogSafe } from "../../shared/security/write-audit-log.js";

interface ClientsAuditInput {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logClientsAuditEvent(
  input: ClientsAuditInput,
): Promise<void> {
  await writeAuditLogSafe(
    {
      userId: input.userId ?? null,
      action: input.action,
      resource: "clients",
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    "clients",
  );
}

export const CLIENTS_AUDIT_ACTIONS = {
  CREATE: "clients.create",
  UPDATE: "clients.update",
  DELETE: "clients.delete",
  PORTAL_USER_LINK: "clients.portal_user.link",
  PORTAL_USER_UNLINK: "clients.portal_user.unlink",
  PORTAL_COMPANY_AUTO_LINK: "clients.portal_company.auto_link",
  PORTAL_COMPANY_AUTO_CREATE: "clients.portal_company.auto_create",
} as const;
