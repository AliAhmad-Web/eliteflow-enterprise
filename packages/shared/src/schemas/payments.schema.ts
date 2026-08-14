import { z } from "zod";

import { uuidSchema } from "./common.schema.js";

export const JAZZCASH_QR_IMAGE_PATH = "/payments/jazzcash-qr.png" as const;
export const JAZZCASH_QR_TILL_ID = "984175579" as const;
export const JAZZCASH_QR_USSD = "*786*10#" as const;
export const JAZZCASH_QR_MERCHANT_NAME = "ALI Shop" as const;

export const EASYPAISA_QR_IMAGE_PATH = "/payments/easypaisa-qr.png" as const;
export const EASYPAISA_QR_ACCOUNT_NAME = "ALI AHMED" as const;
export const EASYPAISA_QR_MSISDN_MASKED = "********2254" as const;

export const PAKISTAN_PAYMENT_METHODS = [
  "BANK_TRANSFER",
  "JAZZCASH",
  "EASYPAISA",
] as const;

export const PAYMENT_EXECUTION_STATUSES = [
  "INITIATED",
  "PENDING",
  "PENDING_VERIFICATION",
  "VERIFIED",
  "PAID",
  "FAILED",
  "EXPIRED",
  "REJECTED",
  "REFUNDED",
] as const;

export const PAYMENT_REFUND_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
  "FAILED",
] as const;

export const pakistanPaymentMethodSchema = z.enum(PAKISTAN_PAYMENT_METHODS);
export const paymentExecutionStatusSchema = z.enum(PAYMENT_EXECUTION_STATUSES);
export const paymentRefundStatusSchema = z.enum(PAYMENT_REFUND_STATUSES);

export type PakistanPaymentMethodValue = z.infer<
  typeof pakistanPaymentMethodSchema
>;
export type PaymentExecutionStatusValue = z.infer<
  typeof paymentExecutionStatusSchema
>;
export type PaymentRefundStatusValue = z.infer<typeof paymentRefundStatusSchema>;

/** Statuses that count toward invoice paidAmount. */
export const PAYMENT_SETTLED_STATUSES = ["VERIFIED", "PAID"] as const;

export const IN_FLIGHT_PAYMENT_STATUSES = [
  "INITIATED",
  "PENDING",
  "PENDING_VERIFICATION",
] as const;

export const PAYMENT_TRANSITIONS: Record<
  PaymentExecutionStatusValue,
  readonly PaymentExecutionStatusValue[]
> = {
  INITIATED: [
    "PENDING",
    "PENDING_VERIFICATION",
    "VERIFIED",
    "PAID",
    "FAILED",
    "EXPIRED",
  ],
  PENDING: [
    "PENDING_VERIFICATION",
    "VERIFIED",
    "PAID",
    "FAILED",
    "EXPIRED",
  ],
  PENDING_VERIFICATION: ["VERIFIED", "PAID", "REJECTED", "FAILED"],
  VERIFIED: ["PAID", "REFUNDED"],
  PAID: ["REFUNDED"],
  FAILED: [],
  EXPIRED: ["VERIFIED", "PAID"],
  REJECTED: [],
  REFUNDED: [],
};

export function canTransitionPaymentStatus(
  from: PaymentExecutionStatusValue,
  to: PaymentExecutionStatusValue,
): boolean {
  if (from === to) return true;
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type DerivedInvoicePaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "PARTIALLY_PAID"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED";

export function invoicePaymentStatusFromTotals(
  total: number,
  paidAmount: number,
  hasInFlight: boolean,
  extras: {
    hasRefunded?: boolean;
    hasFailed?: boolean;
    hasExpired?: boolean;
  } = {},
): DerivedInvoicePaymentStatus {
  const paid = roundMoney(Math.max(0, paidAmount));
  const due = roundMoney(Math.max(0, total));
  if (paid >= due && due > 0) return "PAID";
  if (paid > 0 && paid < due) return "PARTIALLY_PAID";
  if (hasInFlight) return "PENDING";
  if (paid === 0 && extras.hasRefunded) return "REFUNDED";
  if (extras.hasFailed) return "FAILED";
  if (extras.hasExpired) return "EXPIRED";
  return "UNPAID";
}

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must not exceed ${max} characters`);

export const bankTransferSubmitSchema = z.object({
  invoiceId: uuidSchema,
  amount: z.coerce
    .number({ required_error: "Amount is required" })
    .positive("Amount must be greater than 0")
    .max(999999999, "Amount is too large"),
  customerReference: z
    .string({ required_error: "Transaction reference is required" })
    .trim()
    .min(3, "Transaction reference is required")
    .max(120, "Transaction reference is too long"),
  paidAt: z
    .string({ required_error: "Payment date is required" })
    .trim()
    .min(1, "Payment date is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid payment date"),
  notes: optionalText("Notes", 2000).optional(),
  proofFileId: uuidSchema.optional(),
});

export type BankTransferSubmitInput = z.infer<typeof bankTransferSubmitSchema>;

export const walletPaymentNoticeSchema = z.object({
  invoiceId: uuidSchema,
  method: z.enum(["JAZZCASH", "EASYPAISA"]),
  amount: z.coerce
    .number({ required_error: "Amount is required" })
    .positive("Amount must be greater than 0")
    .max(999999999, "Amount is too large"),
  customerReference: z
    .string({ required_error: "Transaction ID is required" })
    .trim()
    .min(3, "Transaction ID is required")
    .max(120, "Transaction ID is too long"),
  paidAt: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || !Number.isNaN(Date.parse(value)),
      "Invalid payment date",
    )
    .optional(),
  notes: optionalText("Notes", 2000).optional(),
  proofFileId: uuidSchema.optional(),
});

export type WalletPaymentNoticeInput = z.infer<typeof walletPaymentNoticeSchema>;

export const initiateProviderPaymentSchema = z.object({
  invoiceId: uuidSchema,
});

export type InitiateProviderPaymentInput = z.infer<
  typeof initiateProviderPaymentSchema
>;

export const verifyPaymentSchema = z.object({
  notes: optionalText("Verification notes", 2000).optional(),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export const rejectPaymentSchema = z.object({
  reason: z
    .string({ required_error: "Rejection reason is required" })
    .trim()
    .min(3, "Rejection reason is required")
    .max(500, "Rejection reason is too long"),
});

export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;

export const createPaymentRefundSchema = z.object({
  amount: z.coerce
    .number({ required_error: "Refund amount is required" })
    .positive("Refund amount must be greater than 0")
    .max(999999999, "Refund amount is too large"),
  reason: z
    .string({ required_error: "Refund reason is required" })
    .trim()
    .min(3, "Refund reason is required")
    .max(500, "Refund reason is too long"),
  notes: optionalText("Notes", 2000).optional(),
});

export type CreatePaymentRefundInput = z.infer<typeof createPaymentRefundSchema>;

export const decidePaymentRefundSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  notes: optionalText("Notes", 2000).optional(),
});

export type DecidePaymentRefundInput = z.infer<typeof decidePaymentRefundSchema>;

export const updatePaymentMethodConfigSchema = z.object({
  enabled: z.boolean().optional(),
  displayName: z.string().trim().min(1).max(80).optional(),
  instructions: optionalText("Instructions", 4000).optional().nullable(),
  bankName: optionalText("Bank name", 120).optional().nullable(),
  accountTitle: optionalText("Account title", 200).optional().nullable(),
  accountNumber: optionalText("Account number", 64).optional().nullable(),
  iban: optionalText("IBAN", 64).optional().nullable(),
  merchantPublicId: optionalText("Merchant ID", 80).optional().nullable(),
});

export type UpdatePaymentMethodConfigInput = z.infer<
  typeof updatePaymentMethodConfigSchema
>;

export const PAYMENT_SORT_FIELDS = [
  "createdAt",
  "amount",
  "status",
  "method",
  "paymentNumber",
] as const;

export const listPaymentsQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  status: paymentExecutionStatusSchema.optional(),
  method: pakistanPaymentMethodSchema.optional(),
  invoiceId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  quoteId: uuidSchema.optional(),
  sortBy: z.enum(PAYMENT_SORT_FIELDS).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type ListPaymentsQueryInput = z.infer<typeof listPaymentsQuerySchema>;

export const paymentIdParamsSchema = z.object({
  id: uuidSchema,
});

export const paymentMethodParamsSchema = z.object({
  method: pakistanPaymentMethodSchema,
});

export const paymentRefundSchema = z.object({
  id: uuidSchema,
  refundNumber: z.string(),
  paymentId: uuidSchema,
  amount: z.number(),
  reason: z.string(),
  status: paymentRefundStatusSchema,
  notes: z.string().nullable(),
  requestedById: uuidSchema.nullable(),
  authorizedById: uuidSchema.nullable(),
  authorizedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PaymentRefundDto = z.infer<typeof paymentRefundSchema>;

export const paymentSchema = z.object({
  id: uuidSchema,
  paymentNumber: z.string(),
  invoiceId: uuidSchema,
  invoiceNumber: z.string().nullable(),
  clientId: uuidSchema,
  clientName: z.string().nullable(),
  projectId: uuidSchema.nullable(),
  projectName: z.string().nullable(),
  quoteId: uuidSchema.nullable(),
  quoteNumber: z.string().nullable(),
  paymentScheduleItemId: uuidSchema.nullable(),
  method: pakistanPaymentMethodSchema,
  amount: z.number(),
  currency: z.string(),
  status: paymentExecutionStatusSchema,
  providerTxnId: z.string().nullable(),
  customerReference: z.string().nullable(),
  proofFileId: uuidSchema.nullable(),
  paidAtCustomer: z.string().nullable(),
  notes: z.string().nullable(),
  failureReason: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  verificationNotes: z.string().nullable(),
  submittedById: uuidSchema.nullable(),
  verifiedById: uuidSchema.nullable(),
  verifiedByName: z.string().nullable(),
  submittedAt: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  paidAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  invoiceTotal: z.number().nullable().optional(),
  invoicePaidAmount: z.number().nullable().optional(),
  invoiceRemainingAmount: z.number().nullable().optional(),
  invoicePaymentStatus: z.string().nullable().optional(),
  refunds: z.array(paymentRefundSchema).optional(),
});

export type PaymentDto = z.infer<typeof paymentSchema>;

export const paymentMethodConfigSchema = z.object({
  method: pakistanPaymentMethodSchema,
  enabled: z.boolean(),
  displayName: z.string(),
  instructions: z.string().nullable(),
  bankName: z.string().nullable(),
  accountTitle: z.string().nullable(),
  accountNumber: z.string().nullable(),
  iban: z.string().nullable(),
  merchantPublicId: z.string().nullable(),
  qrImageUrl: z.string().nullable().optional(),
  providerReady: z.boolean(),
  updatedAt: z.string(),
});

export type PaymentMethodConfigDto = z.infer<typeof paymentMethodConfigSchema>;

export const hostedCheckoutSchema = z.object({
  paymentId: uuidSchema,
  paymentNumber: z.string(),
  provider: pakistanPaymentMethodSchema,
  actionUrl: z.string(),
  method: z.literal("POST"),
  checkoutPath: z.string(),
  configured: z.boolean(),
});

export type HostedCheckoutDto = z.infer<typeof hostedCheckoutSchema>;
