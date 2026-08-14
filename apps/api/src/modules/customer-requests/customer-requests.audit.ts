import { writeAuditLogSafe } from "../../shared/security/write-audit-log.js";

interface CustomerRequestAuditInput {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logCustomerRequestAuditEvent(
  input: CustomerRequestAuditInput,
): Promise<void> {
  await writeAuditLogSafe(
    {
      userId: input.userId ?? null,
      action: input.action,
      resource: "customer_request",
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    "customer-requests",
  );
}

export const CUSTOMER_REQUEST_AUDIT_ACTIONS = {
  CREATE: "customer_request.create",
  UPDATE: "customer_request.update",
  SUBMIT: "customer_request.submit",
  WITHDRAW: "customer_request.withdraw",
  REVIEW: "customer_request.review",
  CLARIFICATION: "customer_request.clarification",
  APPROVE: "customer_request.approve",
  REJECT: "customer_request.reject",
  CONVERT: "customer_request.convert",
  ATTACH: "customer_request.attach",
  APPLY: "customer_request.apply_continuation",
} as const;
