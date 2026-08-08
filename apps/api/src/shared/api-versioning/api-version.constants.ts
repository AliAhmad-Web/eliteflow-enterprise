/**
 * Enterprise API Versioning constants.
 */

export const API_VERSION_URI_PREFIX = "/api" as const;

export const API_VERSION_HEADER = "API-Version" as const;
export const API_VERSION_RESPONSE_HEADER = "X-API-Version" as const;

export const API_VERSION_ACCEPT_VENDOR = "eliteflow" as const;

export const API_VERSION_EVENTS = {
  API_VERSION_USED: "API_VERSION_USED",
  DEPRECATED_API_VERSION: "DEPRECATED_API_VERSION",
  UNSUPPORTED_API_VERSION: "UNSUPPORTED_API_VERSION",
  API_VERSION_FALLBACK: "API_VERSION_FALLBACK",
  API_VERSION_COMPATIBILITY: "API_VERSION_COMPATIBILITY",
} as const;

export const API_VERSION_AUDIT_ACTIONS = {
  STATUS: "api.versioning.status_viewed",
  VERSIONS: "api.versioning.versions_viewed",
  COMPATIBILITY: "api.versioning.compatibility_viewed",
} as const;

/** Well-known alias tokens. */
export const API_VERSION_ALIASES = {
  LATEST: "latest",
  STABLE: "stable",
  CURRENT: "current",
} as const;
