import { prisma, Prisma } from "@enterprise/database";

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
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        resource: "invoice",
        resourceId: input.resourceId ?? null,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("[invoices] Failed to write audit log:", error);
  }
}

export const INVOICE_AUDIT_ACTIONS = {
  CREATE: "invoice.create",
  UPDATE: "invoice.update",
  DELETE: "invoice.delete",
  PDF: "invoice.pdf",
} as const;
