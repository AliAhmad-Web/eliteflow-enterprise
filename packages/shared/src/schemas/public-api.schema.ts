import { z } from "zod";

import {
  PUBLIC_API_SCOPE_VALUES,
  type PublicApiScope,
} from "../constants/public-api.constants.js";

const scopeSchema = z.enum(
  PUBLIC_API_SCOPE_VALUES as [PublicApiScope, ...PublicApiScope[]],
);

/** Public list pagination — pageSize alias accepted, capped at 100. */
export const publicApiListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().max(200).optional(),
    sortBy: z.string().trim().max(40).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .transform((value) => {
    const pageSize = value.pageSize ?? value.limit ?? 25;
    return {
      page: value.page,
      pageSize,
      limit: pageSize,
      search: value.search,
      sortBy: value.sortBy,
      sortOrder: value.sortOrder,
    };
  });

export type PublicApiListQueryInput = z.infer<typeof publicApiListQuerySchema>;

export const publicApiIdParamsSchema = z.object({
  id: z.string().uuid("Invalid resource id"),
});

export type PublicApiIdParamsInput = z.infer<typeof publicApiIdParamsSchema>;

export const createPublicApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must not exceed 120 characters"),
  scopes: z
    .array(scopeSchema)
    .min(1, "At least one scope is required")
    .max(20),
  /** Optional company binding — never accepted from public data callers. */
  clientId: z.string().uuid().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export type CreatePublicApiKeyInput = z.infer<typeof createPublicApiKeySchema>;

export const publicApiKeyIdParamsSchema = z.object({
  id: z.string().uuid("Invalid API key id"),
});

export type PublicApiKeyIdParamsInput = z.infer<
  typeof publicApiKeyIdParamsSchema
>;

export const publicApiKeyDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  keyPrefix: z.string(),
  scopes: z.array(z.string()),
  clientId: z.string().uuid().nullable(),
  lastUsedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PublicApiKeyDto = z.infer<typeof publicApiKeyDtoSchema>;
