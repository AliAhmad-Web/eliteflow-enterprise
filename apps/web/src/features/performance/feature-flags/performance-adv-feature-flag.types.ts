/**
 * Advanced performance feature flag identifiers (Phase 5).
 * Env vars use the NEXT_PUBLIC_PERFORMANCE_ADV_* prefix; defaults are always OFF.
 *
 * Complements Task 1.4 PERFORMANCE_* flags — does not replace them.
 * Phase 2 adds implementation aliases (BUNDLE, PREFETCH, QUERY, PROFILING).
 */
export const PERFORMANCE_ADV_FEATURE_FLAG_IDS = [
  "PERFORMANCE_ADV_ENTERPRISE_FOUNDATION",
  "PERFORMANCE_ADV_VIRTUALIZATION",
  "PERFORMANCE_ADV_QUERY_CACHE",
  "PERFORMANCE_ADV_QUERY",
  "PERFORMANCE_ADV_CODE_SPLITTING",
  "PERFORMANCE_ADV_BUNDLE",
  "PERFORMANCE_ADV_BUNDLE_ANALYSIS",
  "PERFORMANCE_ADV_ROUTE_OPTIMIZATION",
  "PERFORMANCE_ADV_PREFETCH",
  "PERFORMANCE_ADV_IMAGE_OPTIMIZATION",
  "PERFORMANCE_ADV_STREAMING",
  "PERFORMANCE_ADV_PROGRESSIVE_RENDER",
  "PERFORMANCE_ADV_WEB_VITALS",
  "PERFORMANCE_ADV_PROFILING",
  "PERFORMANCE_ADV_HYDRATION",
  "PERFORMANCE_ADV_SCRIPT_LOADING",
] as const;

export type PerformanceAdvFeatureFlagId =
  (typeof PERFORMANCE_ADV_FEATURE_FLAG_IDS)[number];

/** Snapshot of all advanced performance flags (all default false). */
export type PerformanceAdvFeatureFlags = Readonly<
  Record<PerformanceAdvFeatureFlagId, boolean>
>;
