import { writeAuditLogSafe } from "../../shared/security/write-audit-log.js";

interface QuoteAuditInput {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logQuoteAuditEvent(
  input: QuoteAuditInput,
): Promise<void> {
  await writeAuditLogSafe(
    {
      userId: input.userId ?? null,
      action: input.action,
      resource: "quote",
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    "quotes",
  );
}

export const QUOTE_AUDIT_ACTIONS = {
  CREATE: "quote.create",
  UPDATE: "quote.update",
  SEND: "quote.send",
  APPROVE: "quote.approve",
  REJECT: "quote.reject",
  CANCEL: "quote.cancel",
  EXPIRE: "quote.expire",
  SCHEDULE_UPDATE: "quote.schedule_update",
  INVOICE_CREATE: "quote.invoice_create",
  INVOICE_ISSUE: "quote.invoice_issue",
} as const;
