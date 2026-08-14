import { writeAuditLogSafe } from "../../shared/security/write-audit-log.js";

interface InvoiceAuditInput {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logInvoiceAuditEvent(
  input: InvoiceAuditInput,
): Promise<void> {
  await writeAuditLogSafe(
    {
      userId: input.userId ?? null,
      action: input.action,
      resource: "invoice",
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    "invoices",
  );
}

export const INVOICE_AUDIT_ACTIONS = {
  CREATE: "invoice.create",
  UPDATE: "invoice.update",
  DELETE: "invoice.delete",
  PDF: "invoice.pdf",
  ISSUE: "invoice.issue",
  PAYMENT_NOTICE: "invoice.payment_notice",
} as const;
