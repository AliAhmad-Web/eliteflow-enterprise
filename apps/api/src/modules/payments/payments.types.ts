import type {
  Payment,
  PaymentRefund,
  User,
} from "@enterprise/database";
import { Prisma } from "@enterprise/database";
import type {
  PaymentDto,
  PaymentMethodConfigDto,
  PaymentRefundDto,
} from "@enterprise/shared";
import { getEasyPaisaCredentials } from "./providers/easypaisa.js";
import { getJazzCashCredentials } from "./providers/jazzcash.js";

type PaymentWithRelations = Payment & {
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    paymentStatus: string;
  } | null;
  client?: { id: string; companyName: string } | null;
  project?: { id: string; name: string } | null;
  quote?: { id: string; quoteNumber: string } | null;
  verifiedBy?: Pick<User, "id" | "firstName" | "lastName"> | null;
  refunds?: PaymentRefund[];
};

function toMoney(value: Prisma.Decimal | null | undefined): number {
  return value == null ? 0 : Number(value);
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function toDateOnly(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function toPaymentRefundDto(refund: PaymentRefund): PaymentRefundDto {
  return {
    id: refund.id,
    refundNumber: refund.refundNumber,
    paymentId: refund.paymentId,
    amount: toMoney(refund.amount),
    reason: refund.reason,
    status: refund.status,
    notes: refund.notes,
    requestedById: refund.requestedById,
    authorizedById: refund.authorizedById,
    authorizedAt: toIso(refund.authorizedAt),
    completedAt: toIso(refund.completedAt),
    createdAt: refund.createdAt.toISOString(),
    updatedAt: refund.updatedAt.toISOString(),
  };
}

export function toPaymentDto(payment: PaymentWithRelations): PaymentDto {
  const invoiceTotal = payment.invoice ? toMoney(payment.invoice.total) : null;
  const invoicePaid = payment.invoice
    ? toMoney(payment.invoice.paidAmount)
    : null;
  const remaining =
    invoiceTotal != null && invoicePaid != null
      ? Math.max(0, Math.round((invoiceTotal - invoicePaid) * 100) / 100)
      : null;
  const verifiedName = payment.verifiedBy
    ? `${payment.verifiedBy.firstName} ${payment.verifiedBy.lastName}`.trim()
    : null;

  return {
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    invoiceId: payment.invoiceId,
    invoiceNumber: payment.invoice?.invoiceNumber ?? null,
    clientId: payment.clientId,
    clientName: payment.client?.companyName ?? null,
    projectId: payment.projectId,
    projectName: payment.project?.name ?? null,
    quoteId: payment.quoteId,
    quoteNumber: payment.quote?.quoteNumber ?? null,
    paymentScheduleItemId: payment.paymentScheduleItemId,
    method: payment.method,
    amount: toMoney(payment.amount),
    currency: payment.currency,
    status: payment.status,
    providerTxnId: payment.providerTxnId,
    customerReference: payment.customerReference,
    proofFileId: payment.proofFileId,
    paidAtCustomer: toDateOnly(payment.paidAtCustomer),
    notes: payment.notes,
    failureReason: payment.failureReason,
    rejectionReason: payment.rejectionReason,
    verificationNotes: payment.verificationNotes,
    submittedById: payment.submittedById,
    verifiedById: payment.verifiedById,
    verifiedByName: verifiedName,
    submittedAt: toIso(payment.submittedAt),
    verifiedAt: toIso(payment.verifiedAt),
    paidAt: toIso(payment.paidAt),
    expiresAt: toIso(payment.expiresAt),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
    invoiceTotal,
    invoicePaidAmount: invoicePaid,
    invoiceRemainingAmount: remaining,
    invoicePaymentStatus: payment.invoice?.paymentStatus ?? null,
    refunds: payment.refunds?.map(toPaymentRefundDto),
  };
}

export function toPaymentMethodConfigDto(row: {
  method: PaymentMethodConfigDto["method"];
  enabled: boolean;
  displayName: string;
  instructions: string | null;
  bankName: string | null;
  accountTitle: string | null;
  accountNumber: string | null;
  iban: string | null;
  merchantPublicId: string | null;
  updatedAt: Date;
}): PaymentMethodConfigDto {
  const providerReady =
    row.method === "BANK_TRANSFER"
      ? Boolean(row.bankName && row.accountTitle && (row.accountNumber || row.iban))
      : row.method === "JAZZCASH"
        ? Boolean(getJazzCashCredentials())
        : Boolean(getEasyPaisaCredentials());

  return {
    method: row.method,
    enabled: row.enabled,
    displayName: row.displayName,
    instructions: row.instructions,
    bankName: row.bankName,
    accountTitle: row.accountTitle,
    accountNumber: row.accountNumber,
    iban: row.iban,
    merchantPublicId: row.merchantPublicId,
    providerReady,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type { PaymentWithRelations };
