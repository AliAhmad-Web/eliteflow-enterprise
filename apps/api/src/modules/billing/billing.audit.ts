import { writeAuditLogSafe } from "../../shared/security/write-audit-log.js";

export const BILLING_AUDIT_ACTIONS = {
  CHECKOUT_CREATED: "billing.checkout_created",
  SUBSCRIPTION_CANCELLED: "billing.subscription_cancelled",
  SUBSCRIPTION_REACTIVATED: "billing.subscription_reactivated",
  PORTAL_SESSION_CREATED: "billing.portal_session_created",
  WEBHOOK_PROCESSED: "billing.webhook_processed",
  WEBHOOK_DUPLICATE: "billing.webhook_duplicate",
  SUBSCRIPTION_SYNCED: "billing.subscription_synced",
} as const;

export async function logBillingAuditEvent(input: {
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
    resource: "billing",
    resourceId: input.resourceId ?? undefined,
    metadata: input.metadata ?? {},
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });
}
