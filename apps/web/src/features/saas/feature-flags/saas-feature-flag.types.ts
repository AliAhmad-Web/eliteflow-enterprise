/**
 * SaaS scaling feature flag identifiers (Phase 8).
 * Env vars use the NEXT_PUBLIC_SAAS_* prefix; defaults are always OFF.
 *
 * Phase 1 declares only — no production scaling implementation.
 */
export const SAAS_FEATURE_FLAG_IDS = [
  "SAAS_ENTERPRISE_FOUNDATION",
  "SAAS_TENANT_READINESS",
  "SAAS_SCALE_READINESS",
  "SAAS_CACHE_STRATEGY",
  "SAAS_BACKGROUND_PROCESSING",
  "SAAS_QUEUE_SCALING",
  "SAAS_OBSERVABILITY",
  "SAAS_HEALTH_MONITORING",
  "SAAS_USAGE_METRICS",
  "SAAS_CAPACITY_MANAGEMENT",
  "SAAS_OPERATIONAL_READINESS",
] as const;

export type SaasFeatureFlagId = (typeof SAAS_FEATURE_FLAG_IDS)[number];

/** Snapshot of all SaaS flags (all default false). */
export type SaasFeatureFlags = Readonly<Record<SaasFeatureFlagId, boolean>>;
