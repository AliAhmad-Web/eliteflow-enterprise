import { z } from "zod";

import { calculateInvoiceTotals } from "./invoices.schema.js";
import { uuidSchema } from "./common.schema.js";

export const QUOTE_STATUSES = [
  "DRAFT",
  "SENT",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
] as const;

export const PAYMENT_MODELS = [
  "UPFRONT_100",
  "SPLIT_50_50",
  "SPLIT_30_70",
  "MILESTONE",
  "CUSTOM",
] as const;

export const PAYMENT_SCHEDULE_KINDS = [
  "ADVANCE",
  "MILESTONE",
  "FINAL",
  "CUSTOM",
] as const;

export const quoteStatusSchema = z.enum(QUOTE_STATUSES);
export const paymentModelSchema = z.enum(PAYMENT_MODELS);
export const paymentScheduleKindSchema = z.enum(PAYMENT_SCHEDULE_KINDS);

export type QuoteStatusValue = z.infer<typeof quoteStatusSchema>;
export type PaymentModelValue = z.infer<typeof paymentModelSchema>;
export type PaymentScheduleKindValue = z.infer<typeof paymentScheduleKindSchema>;

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must not exceed ${max} characters`);

const dateStringSchema = z
  .string({ required_error: "Date is required" })
  .trim()
  .min(1, "Date is required")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Please enter a valid date");

const moneyStringSchema = (label: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 999999999),
      `${label} must be a positive number`,
    );

const optionalUuid = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.string().uuid().safeParse(value).success,
    "Invalid id",
  );

const quoteItemInputSchema = z.object({
  description: z
    .string({ required_error: "Item description is required" })
    .trim()
    .min(1, "Item description is required")
    .max(500, "Item description must not exceed 500 characters"),
  quantity: z.coerce
    .number({ required_error: "Quantity is required" })
    .positive("Quantity must be greater than 0")
    .max(999999, "Quantity is too large"),
  unitPrice: z.coerce
    .number({ required_error: "Unit price is required" })
    .min(0, "Unit price cannot be negative")
    .max(999999999, "Unit price is too large"),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const paymentScheduleInputSchema = z.object({
  kind: paymentScheduleKindSchema,
  label: z
    .string()
    .trim()
    .min(1, "Schedule item label is required")
    .max(200, "Schedule item label must not exceed 200 characters"),
  percent: z.coerce.number().min(0).max(100).optional(),
  amount: z.coerce.number().min(0).max(999999999).optional(),
  dueDate: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || !Number.isNaN(Date.parse(value)),
      "Please enter a valid date",
    )
    .optional(),
});

export type PaymentScheduleInput = z.infer<typeof paymentScheduleInputSchema>;

export const createQuoteSchema = z
  .object({
    customerRequestId: optionalUuid.optional(),
    projectId: optionalUuid.optional(),
    title: z
      .string({ required_error: "Title is required" })
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must not exceed 200 characters"),
    description: optionalText("Description", 8000).optional(),
    notes: optionalText("Notes", 5000).optional(),
    issueDate: dateStringSchema,
    expiryDate: dateStringSchema,
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .refine((value) => value.length === 3, "Currency must be a 3-letter code")
      .optional()
      .default("USD"),
    taxRate: z.coerce
      .number()
      .min(0, "Tax rate cannot be negative")
      .max(100, "Tax rate cannot exceed 100")
      .optional()
      .default(0),
    discountAmount: moneyStringSchema("Discount").optional().default(""),
    dealAmount: moneyStringSchema("Deal amount").optional(),
    items: z.array(quoteItemInputSchema).optional(),
    paymentModel: paymentModelSchema,
    schedule: z.array(paymentScheduleInputSchema).optional(),
  })
  .refine(
    (data) =>
      Boolean(data.customerRequestId && data.customerRequestId.length > 0) ||
      Boolean(data.projectId && data.projectId.length > 0),
    {
      message: "A customer request or existing project is required",
      path: ["customerRequestId"],
    },
  )
  .refine(
    (data) => {
      const hasItems = Boolean(data.items && data.items.length > 0);
      const deal = data.dealAmount?.trim() ?? "";
      return hasItems || (deal.length > 0 && Number(deal) > 0);
    },
    {
      message: "Deal amount or quote line items are required",
      path: ["dealAmount"],
    },
  );

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

export const updateQuoteSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: optionalText("Description", 8000).optional().nullable(),
    notes: optionalText("Notes", 5000).optional().nullable(),
    issueDate: dateStringSchema.optional(),
    expiryDate: dateStringSchema.optional(),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .refine((value) => value.length === 3, "Currency must be a 3-letter code")
      .optional(),
    taxRate: z.coerce.number().min(0).max(100).optional(),
    discountAmount: moneyStringSchema("Discount").optional(),
    dealAmount: moneyStringSchema("Deal amount").optional(),
    items: z.array(quoteItemInputSchema).optional(),
    paymentModel: paymentModelSchema.optional(),
    schedule: z.array(paymentScheduleInputSchema).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;

export const quoteIdParamsSchema = z.object({
  id: uuidSchema,
});

export type QuoteIdParamsInput = z.infer<typeof quoteIdParamsSchema>;

export const rejectQuoteSchema = z.object({
  reason: z
    .string({ required_error: "Rejection reason is required" })
    .trim()
    .min(1, "Rejection reason is required")
    .max(2000, "Rejection reason must not exceed 2000 characters"),
});

export type RejectQuoteInput = z.infer<typeof rejectQuoteSchema>;

export const generateQuoteInvoicesSchema = z
  .object({
    scheduleItemIds: z.array(uuidSchema).optional(),
  })
  .optional()
  .default({});

export type GenerateQuoteInvoicesInput = z.infer<
  typeof generateQuoteInvoicesSchema
>;

export const QUOTE_SORT_FIELDS = [
  "quoteNumber",
  "status",
  "issueDate",
  "expiryDate",
  "total",
  "createdAt",
  "updatedAt",
] as const;

export const listQuotesQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  status: quoteStatusSchema.optional(),
  customerRequestId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  sortBy: z.enum(QUOTE_SORT_FIELDS).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type ListQuotesQueryInput = z.infer<typeof listQuotesQuerySchema>;

export const quoteItemSchema = z.object({
  id: uuidSchema,
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
  sortOrder: z.number().int(),
});

export const paymentScheduleItemSchema = z.object({
  id: uuidSchema,
  kind: paymentScheduleKindSchema,
  label: z.string(),
  percent: z.number(),
  amount: z.number(),
  dueDate: z.string().nullable(),
  sortOrder: z.number().int(),
  invoiceId: uuidSchema.nullable(),
  invoiceNumber: z.string().nullable(),
  invoiceStatus: z.string().nullable(),
  paymentStatus: z.string().nullable(),
});

export const quoteSchema = z.object({
  id: uuidSchema,
  quoteNumber: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  clientId: uuidSchema,
  clientName: z.string(),
  customerRequestId: uuidSchema.nullable(),
  customerRequestTitle: z.string().nullable(),
  requestedBudget: z.number().nullable(),
  projectId: uuidSchema,
  projectName: z.string(),
  status: quoteStatusSchema,
  paymentModel: paymentModelSchema,
  currency: z.string(),
  taxRate: z.number(),
  discountAmount: z.number(),
  subtotal: z.number(),
  taxAmount: z.number(),
  total: z.number(),
  issueDate: z.string(),
  expiryDate: z.string(),
  sentAt: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdById: uuidSchema.nullable(),
  updatedById: uuidSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(quoteItemSchema),
  paymentSchedule: z.array(paymentScheduleItemSchema),
});

export type QuoteDto = z.infer<typeof quoteSchema>;
export type QuoteItemDto = z.infer<typeof quoteItemSchema>;
export type PaymentScheduleItemDto = z.infer<typeof paymentScheduleItemSchema>;

export function calculateQuoteTotals(input: {
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    sortOrder?: number;
  }>;
  dealAmount?: string | number;
  title?: string;
  taxRate: number;
  discountAmount: number | string;
}) {
  const items =
    input.items && input.items.length > 0
      ? input.items
      : [
          {
            description: input.title?.trim() || "Agreed project amount",
            quantity: 1,
            unitPrice: Number(input.dealAmount ?? 0),
            sortOrder: 0,
          },
        ];

  return calculateInvoiceTotals({
    items,
    taxRate: input.taxRate,
    discountAmount: input.discountAmount,
  });
}
