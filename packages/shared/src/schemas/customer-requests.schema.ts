import { z } from "zod";

import { isAttachmentUrlSchemeAllowed } from "../utils/attachment-url.js";
import { uuidSchema } from "./common.schema.js";

export const CUSTOMER_REQUEST_TYPES = [
  "NEW_PROJECT",
  "NEW_TASK",
  "GENERAL_SERVICE",
] as const;

export const CUSTOMER_REQUEST_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CLARIFICATION_REQUESTED",
  "APPROVED",
  "REJECTED",
  "CONVERTED",
  "CANCELLED",
] as const;

export const CUSTOMER_REQUEST_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const;

export const CUSTOMER_REQUEST_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "preferredDeadline",
  "priority",
  "status",
  "title",
] as const;

export const customerRequestTypeSchema = z.enum(CUSTOMER_REQUEST_TYPES);
export const customerRequestStatusSchema = z.enum(CUSTOMER_REQUEST_STATUSES);
export const customerRequestPrioritySchema = z.enum(CUSTOMER_REQUEST_PRIORITIES);

export type CustomerRequestTypeValue = z.infer<typeof customerRequestTypeSchema>;
export type CustomerRequestStatusValue = z.infer<
  typeof customerRequestStatusSchema
>;
export type CustomerRequestPriorityValue = z.infer<
  typeof customerRequestPrioritySchema
>;

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must not exceed ${max} characters`);

const optionalDateString = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || !Number.isNaN(Date.parse(value)),
    "Please enter a valid date",
  );

const moneyStringSchema = (label: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (!Number.isNaN(Number(value)) &&
          Number(value) >= 0 &&
          Number(value) <= 999999999),
      `${label} must be a positive number`,
    );

const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code")
  .default("USD");

const attachmentInputSchema = z.object({
  fileName: z
    .string({ required_error: "File name is required" })
    .trim()
    .min(1, "File name is required")
    .max(255, "File name must not exceed 255 characters"),
  fileUrl: z
    .string({ required_error: "File URL is required" })
    .trim()
    .max(2048, "File URL must not exceed 2048 characters")
    .refine(
      isAttachmentUrlSchemeAllowed,
      "Forbidden attachment URL scheme. Use a File Manager file.",
    ),
  mimeType: optionalText("MIME type", 120).optional().nullable(),
  sizeBytes: z.coerce.number().int().min(0).nullable().optional(),
  managedFileId: uuidSchema.optional().nullable(),
});

export const customerRequestAttachmentSchema = attachmentInputSchema.extend({
  id: uuidSchema,
  createdAt: z.string(),
});

export type CustomerRequestAttachmentDto = z.infer<
  typeof customerRequestAttachmentSchema
>;

/** CLIENT create — never accepts clientId/status/staff fields. */
export const createCustomerRequestSchema = z.object({
  type: customerRequestTypeSchema,
  title: z
    .string({ required_error: "Title is required" })
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must not exceed 200 characters"),
  description: optionalText("Description", 5000).optional().nullable(),
  requirements: optionalText("Requirements", 10000).optional().nullable(),
  preferredDeadline: optionalDateString.optional().nullable(),
  expectedBudget: moneyStringSchema("Expected budget").optional().nullable(),
  currency: currencySchema.optional(),
  priority: customerRequestPrioritySchema.optional(),
  additionalNotes: optionalText("Additional notes", 5000).optional().nullable(),
  /** Optional existing company project for NEW_TASK (validated server-side). */
  targetProjectId: z
    .string()
    .trim()
    .uuid("Invalid project")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  attachments: z.array(attachmentInputSchema).max(20).optional(),
  /** When true, create as SUBMITTED instead of DRAFT. */
  submit: z.boolean().optional(),
});

export type CreateCustomerRequestInput = z.infer<
  typeof createCustomerRequestSchema
>;

/** CLIENT patch — editable content only. */
export const updateCustomerRequestSchema = z
  .object({
    type: customerRequestTypeSchema.optional(),
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must not exceed 200 characters")
      .optional(),
    description: optionalText("Description", 5000).optional().nullable(),
    requirements: optionalText("Requirements", 10000).optional().nullable(),
    preferredDeadline: optionalDateString.optional().nullable(),
    expectedBudget: moneyStringSchema("Expected budget").optional().nullable(),
    currency: currencySchema.optional(),
    priority: customerRequestPrioritySchema.optional(),
    additionalNotes: optionalText("Additional notes", 5000)
      .optional()
      .nullable(),
    /**
     * Customer reply to the current admin clarification.
     * Only persisted when the request is CLARIFICATION_REQUESTED.
     */
    clarificationResponse: optionalText("Response to Admin", 5000)
      .optional()
      .nullable(),
    targetProjectId: z
      .string()
      .trim()
      .uuid("Invalid project")
      .optional()
      .nullable()
      .or(z.literal("").transform(() => null)),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type UpdateCustomerRequestInput = z.infer<
  typeof updateCustomerRequestSchema
>;

export const customerRequestIdParamsSchema = z.object({
  id: uuidSchema,
});

export type CustomerRequestIdParamsInput = z.infer<
  typeof customerRequestIdParamsSchema
>;

export const listCustomerRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional().default(""),
  status: customerRequestStatusSchema.optional(),
  type: customerRequestTypeSchema.optional(),
  priority: customerRequestPrioritySchema.optional(),
  sortBy: z.enum(CUSTOMER_REQUEST_SORT_FIELDS).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ListCustomerRequestsQueryInput = z.infer<
  typeof listCustomerRequestsQuerySchema
>;

export const startCustomerRequestReviewSchema = z.object({
  staffNotes: optionalText("Staff notes", 5000).optional().nullable(),
});

export type StartCustomerRequestReviewInput = z.infer<
  typeof startCustomerRequestReviewSchema
>;

export const clarifyCustomerRequestSchema = z.object({
  message: z
    .string({ required_error: "Clarification message is required" })
    .trim()
    .min(1, "Clarification message is required")
    .max(5000, "Clarification message must not exceed 5000 characters"),
  staffNotes: optionalText("Staff notes", 5000).optional().nullable(),
});

export type ClarifyCustomerRequestInput = z.infer<
  typeof clarifyCustomerRequestSchema
>;

export const approveCustomerRequestSchema = z.object({
  staffNotes: optionalText("Staff notes", 5000).optional().nullable(),
});

export type ApproveCustomerRequestInput = z.infer<
  typeof approveCustomerRequestSchema
>;

export const rejectCustomerRequestSchema = z.object({
  reason: z
    .string({ required_error: "Rejection reason is required" })
    .trim()
    .min(1, "Rejection reason is required")
    .max(5000, "Rejection reason must not exceed 5000 characters"),
  staffNotes: optionalText("Staff notes", 5000).optional().nullable(),
});

export type RejectCustomerRequestInput = z.infer<
  typeof rejectCustomerRequestSchema
>;

export const convertCustomerRequestSchema = z.object({
  createProject: z.boolean().optional(),
  createTask: z.boolean().optional(),
  /** Required when creating a task against an existing project. */
  projectId: uuidSchema.optional().nullable(),
  /** Optional staff-only assignee for created task — never from CLIENT create. */
  assignedToId: uuidSchema.optional().nullable(),
  staffNotes: optionalText("Staff notes", 5000).optional().nullable(),
});

export type ConvertCustomerRequestInput = z.infer<
  typeof convertCustomerRequestSchema
>;

export const addCustomerRequestAttachmentSchema = attachmentInputSchema;

export type AddCustomerRequestAttachmentInput = z.infer<
  typeof addCustomerRequestAttachmentSchema
>;

export const customerRequestSchema = z.object({
  id: uuidSchema,
  /** Null while the requester is still in unlinked onboarding. */
  clientId: uuidSchema.nullable(),
  clientName: z.string().nullable(),
  createdById: uuidSchema,
  createdByName: z.string().nullable(),
  createdByEmail: z.string().nullable(),
  type: customerRequestTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  requirements: z.string().nullable(),
  preferredDeadline: z.string().nullable(),
  expectedBudget: z.number().nullable(),
  currency: z.string(),
  priority: customerRequestPrioritySchema,
  status: customerRequestStatusSchema,
  additionalNotes: z.string().nullable(),
  staffNotes: z.string().nullable(),
  clarificationMessage: z.string().nullable(),
  clarificationResponse: z.string().nullable(),
  clarificationHistory: z
    .array(
      z.object({
        at: z.string(),
        from: z.enum(["admin", "customer"]),
        message: z.string(),
      }),
    )
    .nullable(),
  rejectionReason: z.string().nullable(),
  targetProjectId: uuidSchema.nullable(),
  targetProjectName: z.string().nullable(),
  convertedProjectId: uuidSchema.nullable(),
  convertedTaskId: uuidSchema.nullable(),
  reviewedById: uuidSchema.nullable(),
  reviewedByName: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  submittedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  attachments: z.array(customerRequestAttachmentSchema),
});

export type CustomerRequestDto = z.infer<typeof customerRequestSchema>;
