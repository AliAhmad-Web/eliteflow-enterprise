import { z } from "zod";

import { emailSchema, uuidSchema } from "./common.schema.js";

export const CLIENT_STATUSES = ["LEAD", "ACTIVE", "INACTIVE"] as const;

export const clientStatusSchema = z.enum(CLIENT_STATUSES, {
  required_error: "Status is required",
  invalid_type_error: "Invalid client status",
});

export type ClientStatusValue = z.infer<typeof clientStatusSchema>;

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

export const clientIdParamsSchema = z.object({
  id: uuidSchema,
});

export type ClientIdParamsInput = z.infer<typeof clientIdParamsSchema>;

export const CLIENT_SORT_FIELDS = [
  "companyName",
  "contactName",
  "email",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export const listClientsQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  status: clientStatusSchema.optional(),
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
  notes: z.string().nullable(),
  createdById: uuidSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ClientDto = z.infer<typeof clientSchema>;
