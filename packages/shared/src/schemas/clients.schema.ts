import { z } from "zod";

import { emailSchema, uuidSchema } from "./common.schema.js";

export const CLIENT_STATUSES = ["LEAD", "ACTIVE", "INACTIVE"] as const;

export const clientStatusSchema = z.enum(CLIENT_STATUSES, {
  required_error: "Status is required",
  invalid_type_error: "Invalid client status",
});

export type ClientStatusValue = z.infer<typeof clientStatusSchema>;

export const CLIENT_PIPELINE_STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export const clientPipelineStageSchema = z.enum(CLIENT_PIPELINE_STAGES, {
  required_error: "Pipeline stage is required",
  invalid_type_error: "Invalid pipeline stage",
});

export type ClientPipelineStageValue = z.infer<typeof clientPipelineStageSchema>;

export const CLIENT_ACTIVITY_TYPES = [
  "NOTE",
  "CALL",
  "EMAIL",
  "MEETING",
  "STATUS_CHANGE",
  "OTHER",
] as const;

export const clientActivityTypeSchema = z.enum(CLIENT_ACTIVITY_TYPES, {
  required_error: "Activity type is required",
  invalid_type_error: "Invalid activity type",
});

export type ClientActivityTypeValue = z.infer<typeof clientActivityTypeSchema>;

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(40, "Phone must not exceed 40 characters")
  .refine(
    (value) => value === "" || /^[+]?[\d\s().-]{7,40}$/.test(value),
    "Please enter a valid phone number",
  );

const optionalWebsiteSchema = z
  .string()
  .trim()
  .max(2048, "Website must not exceed 2048 characters")
  .refine(
    (value) => value === "" || z.string().url().safeParse(value).success,
    "Please enter a valid website URL",
  );

const optionalShortText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must not exceed ${max} characters`);

export const clientFieldsSchema = z.object({
  companyName: z
    .string({ required_error: "Company name is required" })
    .trim()
    .min(1, "Company name is required")
    .max(200, "Company name must not exceed 200 characters"),
  contactName: z
    .string({ required_error: "Contact name is required" })
    .trim()
    .min(1, "Contact name is required")
    .max(200, "Contact name must not exceed 200 characters"),
  email: emailSchema,
  phone: optionalPhoneSchema,
  website: optionalWebsiteSchema,
  addressLine1: optionalShortText("Address", 255),
  city: optionalShortText("City", 100),
  country: optionalShortText("Country", 100),
  status: clientStatusSchema,
  pipelineStage: clientPipelineStageSchema.optional().nullable(),
  notes: optionalShortText("Notes", 5000),
});

export const createClientSchema = clientFieldsSchema;

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = clientFieldsSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const updateClientPipelineStageSchema = z.object({
  pipelineStage: clientPipelineStageSchema,
});

export type UpdateClientPipelineStageInput = z.infer<
  typeof updateClientPipelineStageSchema
>;

export const clientIdParamsSchema = z.object({
  id: uuidSchema,
});

export type ClientIdParamsInput = z.infer<typeof clientIdParamsSchema>;

export const clientActivityIdParamsSchema = z.object({
  id: uuidSchema,
  activityId: uuidSchema,
});

export type ClientActivityIdParamsInput = z.infer<
  typeof clientActivityIdParamsSchema
>;

export const CLIENT_SORT_FIELDS = [
  "companyName",
  "contactName",
  "email",
  "status",
  "pipelineStage",
  "createdAt",
  "updatedAt",
] as const;

export const listClientsQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  status: clientStatusSchema.optional(),
  pipelineStage: clientPipelineStageSchema.optional(),
  sortBy: z.enum(CLIENT_SORT_FIELDS).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type ListClientsQueryInput = z.infer<typeof listClientsQuerySchema>;

export const clientSchema = z.object({
  id: uuidSchema,
  companyName: z.string(),
  contactName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  addressLine1: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  status: clientStatusSchema,
  pipelineStage: clientPipelineStageSchema.nullable(),
  notes: z.string().nullable(),
  createdById: uuidSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ClientDto = z.infer<typeof clientSchema>;

export const clientActivitySchema = z.object({
  id: uuidSchema,
  clientId: uuidSchema,
  type: clientActivityTypeSchema,
  title: z.string(),
  body: z.string().nullable(),
  occurredAt: z.string(),
  createdById: uuidSchema.nullable(),
  createdByName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ClientActivityDto = z.infer<typeof clientActivitySchema>;

export const createClientActivitySchema = z.object({
  type: clientActivityTypeSchema.optional().default("NOTE"),
  title: z
    .string({ required_error: "Title is required" })
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must not exceed 200 characters"),
  body: optionalShortText("Body", 5000).optional(),
  occurredAt: z.string().datetime().optional(),
});

export type CreateClientActivityInput = z.infer<
  typeof createClientActivitySchema
>;

export const listClientActivitiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ListClientActivitiesQueryInput = z.infer<
  typeof listClientActivitiesQuerySchema
>;

export const clientPipelineColumnSchema = z.object({
  stage: clientPipelineStageSchema,
  count: z.number().int().nonnegative(),
  clients: z.array(clientSchema),
});

export type ClientPipelineColumnDto = z.infer<typeof clientPipelineColumnSchema>;

export const clientPipelineBoardSchema = z.object({
  columns: z.array(clientPipelineColumnSchema),
  total: z.number().int().nonnegative(),
});

export type ClientPipelineBoardDto = z.infer<typeof clientPipelineBoardSchema>;

export const portalUserSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  firstName: z.string(),
  lastName: z.string(),
  status: z.string(),
  companyId: uuidSchema.nullable(),
  companyName: z.string().nullable(),
  createdAt: z.string(),
});

export type PortalUserDto = z.infer<typeof portalUserSchema>;

export const linkPortalUserSchema = z.object({
  userId: uuidSchema,
});

export type LinkPortalUserInput = z.infer<typeof linkPortalUserSchema>;

export const portalUserIdParamsSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
});

export type PortalUserIdParamsInput = z.infer<typeof portalUserIdParamsSchema>;

export const listUnlinkedPortalUsersQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ListUnlinkedPortalUsersQueryInput = z.infer<
  typeof listUnlinkedPortalUsersQuerySchema
>;
