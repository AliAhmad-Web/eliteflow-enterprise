/**
 * Security feature flag identifiers (Phase 4).
 * Env vars use the NEXT_PUBLIC_SECURITY_* prefix; defaults are always OFF.
 *
 * Phase 1 IDs retained; Phase 2 adds implementation aliases.
 */
export const SECURITY_FEATURE_FLAG_IDS = [
  "SECURITY_ENTERPRISE_FOUNDATION",
  "SECURITY_HTTP_HEADERS",
  "SECURITY_HEADERS",
  "SECURITY_CSP",
  "SECURITY_SECURE_COOKIES",
  "SECURITY_SESSION_POLICIES",
  "SECURITY_SESSION_HARDENING",
  "SECURITY_AUDIT_ENHANCEMENT",
  "SECURITY_MONITORING",
  "SECURITY_RATE_LIMIT_HARDENING",
  "SECURITY_RATE_LIMITING",
  "SECURITY_REQUEST_VALIDATION",
  "SECURITY_PERMISSION_ENFORCEMENT",
  "SECURITY_PERMISSION_REFRESH",
  "SECURITY_EDGE_AUTH",
  "SECURITY_UPLOAD_HARDENING",
] as const;

export type SecurityFeatureFlagId =
  (typeof SECURITY_FEATURE_FLAG_IDS)[number];

/** Snapshot of all security flags (all default false). */
export type SecurityFeatureFlags = Readonly<
  Record<SecurityFeatureFlagId, boolean>
>;
