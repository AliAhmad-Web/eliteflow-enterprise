import { writeAuditLogSafe } from "../../shared/security/write-audit-log.js";

interface PaymentAuditInput {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logPaymentAuditEvent(
  input: PaymentAuditInput,
): Promise<void> {
  await writeAuditLogSafe(
    {
      userId: input.userId ?? null,
      action: input.action,
      resource: "payment",
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    "payments",
  );
}

export const PAYMENT_AUDIT_ACTIONS = {
  INITIATED: "payment.initiated",
  SUBMITTED: "payment.submitted",
  PROOF_UPLOADED: "payment.proof_uploaded",
  VERIFIED: "payment.verified",
  REJECTED: "payment.rejected",
  FAILED: "payment.failed",
  EXPIRED: "payment.expired",
  REFUNDED: "payment.refunded",
  INVOICE_PAID: "payment.invoice_marked_paid",
  CALLBACK_RECEIVED: "payment.provider_callback_received",
  CALLBACK_REJECTED: "payment.invalid_callback_rejected",
  METHOD_UPDATED: "payment.method_updated",
} as const;
