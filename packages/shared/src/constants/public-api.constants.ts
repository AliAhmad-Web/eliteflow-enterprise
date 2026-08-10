/**
 * Public API v1 scopes — explicit, least-privilege.
 * Machine credentials must present matching scopes for each resource.
 */
export const PUBLIC_API_SCOPES = {
  PUBLIC_READ: "public:read",
  CLIENTS_READ: "clients:read",
  PROJECTS_READ: "projects:read",
  TASKS_READ: "tasks:read",
  INVOICES_READ: "invoices:read",
} as const;

export type PublicApiScope =
  (typeof PUBLIC_API_SCOPES)[keyof typeof PUBLIC_API_SCOPES];

export const PUBLIC_API_SCOPE_VALUES = Object.values(
  PUBLIC_API_SCOPES,
) as PublicApiScope[];

export const PUBLIC_API_KEY_PREFIX = "ef_live_" as const;

export const PUBLIC_API_ERROR_CODES = {
  UNAUTHORIZED: "PUBLIC_API_UNAUTHORIZED",
  FORBIDDEN: "PUBLIC_API_FORBIDDEN",
  MISSING_SCOPE: "PUBLIC_API_MISSING_SCOPE",
  NOT_FOUND: "PUBLIC_API_NOT_FOUND",
  VALIDATION_ERROR: "PUBLIC_API_VALIDATION_ERROR",
  RATE_LIMITED: "PUBLIC_API_RATE_LIMITED",
  KEY_REVOKED: "PUBLIC_API_KEY_REVOKED",
  KEY_EXPIRED: "PUBLIC_API_KEY_EXPIRED",
  INTERNAL_ERROR: "PUBLIC_API_INTERNAL_ERROR",
} as const;

export type PublicApiErrorCode =
  (typeof PUBLIC_API_ERROR_CODES)[keyof typeof PUBLIC_API_ERROR_CODES];
