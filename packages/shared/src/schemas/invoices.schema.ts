import { z } from "zod";

import { uuidSchema } from "./common.schema.js";

export const INVOICE_STATUSES = [
  "DRAFT",
  "SENT",
  "PENDING",
  "PAID",
  "OVERDUE",
  "CANCELLED",
] as const;

export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);
export type InvoiceStatusValue = z.infer<typeof invoiceStatusSchema>;

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

const invoiceItemInputSchema = z.object({
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
  sortOrder: z.coerce.number().int().min(0),
});

export const invoiceFieldsSchema = z.object({
  clientId: uuidSchema,
  projectId: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().uuid().safeParse(value).success,
      "Invalid project",
    ),
  status: invoiceStatusSchema,
  issueDate: dateStringSchema,
  dueDate: dateStringSchema,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value.length === 3, "Currency must be a 3-letter code"),
  taxRate: z.coerce
    .number()
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100"),
  discountAmount: moneyStringSchema("Discount"),
  notes: optionalText("Notes", 5000),
  items: z
    .array(invoiceItemInputSchema)
    .min(1, "Add at least one invoice item"),
});

export const createInvoiceSchema = invoiceFieldsSchema;

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = invoiceFieldsSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export const invoiceIdParamsSchema = z.object({
  id: uuidSchema,
});

export type InvoiceIdParamsInput = z.infer<typeof invoiceIdParamsSchema>;

export const INVOICE_SORT_FIELDS = [
  "invoiceNumber",
  "status",
  "issueDate",
  "dueDate",
  "total",
  "createdAt",
  "updatedAt",
] as const;

export const listInvoicesQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  status: invoiceStatusSchema.optional(),
  clientId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  sortBy: z.enum(INVOICE_SORT_FIELDS).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type ListInvoicesQueryInput = z.infer<typeof listInvoicesQuerySchema>;

export interface InvoiceTotals {
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    sortOrder: number;
  }>;
}

export function calculateInvoiceTotals(input: {
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    sortOrder?: number;
  }>;
  taxRate: number;
  discountAmount: number | string;
}): InvoiceTotals {
  const discountRaw =
    typeof input.discountAmount === "string"
      ? input.discountAmount.trim() === ""
        ? 0
        : Number(input.discountAmount)
      : input.discountAmount;

  const discountAmount = Number.isFinite(discountRaw)
    ? Math.max(0, discountRaw)
    : 0;

  const items = input.items.map((item, index) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const lineTotal = roundMoney(quantity * unitPrice);
    return {
      description: item.description,
      quantity,
      unitPrice,
      lineTotal,
      sortOrder: item.sortOrder ?? index,
    };
  });

  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.lineTotal, 0),
  );
  const cappedDiscount = roundMoney(Math.min(discountAmount, subtotal));
  const taxable = roundMoney(Math.max(0, subtotal - cappedDiscount));
  const taxRate = Number(input.taxRate) || 0;
  const taxAmount = roundMoney(taxable * (taxRate / 100));
  const total = roundMoney(taxable + taxAmount);

  return {
    subtotal,
    discountAmount: cappedDiscount,
    taxRate,
    taxAmount,
    total,
    items,
  };
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export const invoiceItemSchema = z.object({
  id: uuidSchema,
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
  sortOrder: z.number().int(),
});

export const invoicePaymentHistorySchema = z.object({
  id: uuidSchema,
  status: invoiceStatusSchema,
  amount: z.number().nullable(),
  note: z.string().nullable(),
  actorId: uuidSchema.nullable(),
  actorFirstName: z.string().nullable(),
  actorLastName: z.string().nullable(),
  createdAt: z.string(),
});

export const invoiceSchema = z.object({
  id: uuidSchema,
  invoiceNumber: z.string(),
  clientId: uuidSchema,
  clientName: z.string(),
  projectId: uuidSchema.nullable(),
  projectName: z.string().nullable(),
  status: invoiceStatusSchema,
  issueDate: z.string(),
  dueDate: z.string(),
  currency: z.string(),
  taxRate: z.number(),
  discountAmount: z.number(),
  subtotal: z.number(),
  taxAmount: z.number(),
  total: z.number(),
  notes: z.string().nullable(),
  createdById: uuidSchema.nullable(),
  updatedById: uuidSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(invoiceItemSchema),
  paymentHistory: z.array(invoicePaymentHistorySchema).optional(),
});

export type InvoiceDto = z.infer<typeof invoiceSchema>;
export type InvoiceItemDto = z.infer<typeof invoiceItemSchema>;
export type InvoicePaymentHistoryDto = z.infer<
  typeof invoicePaymentHistorySchema
>;
