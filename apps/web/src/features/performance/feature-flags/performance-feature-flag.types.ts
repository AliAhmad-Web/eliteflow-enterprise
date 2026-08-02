/**
 * Performance feature flag identifiers (Task 1.4 Phase 1).
 * Env vars use the NEXT_PUBLIC_PERFORMANCE_* prefix; defaults are always OFF.
 */
export const PERFORMANCE_FEATURE_FLAG_IDS = [
  "PERFORMANCE_ENTERPRISE_FOUNDATION",
  "PERFORMANCE_QUERY_TUNING",
  "PERFORMANCE_MEMOIZATION",
  "PERFORMANCE_STABLE_CALLBACKS",
  "PERFORMANCE_RENDER_PROFILING",
  "PERFORMANCE_ROUTE_PREFETCH",
  "PERFORMANCE_VIRTUAL_LISTS",
  "PERFORMANCE_BUNDLE_ANALYTICS",
  "PERFORMANCE_BUNDLE_OPTIMIZATION",
] as const;

export type PerformanceFeatureFlagId =
  (typeof PERFORMANCE_FEATURE_FLAG_IDS)[number];

/** Snapshot of all performance flags (all default false). */
export type PerformanceFeatureFlags = Readonly<
  Record<PerformanceFeatureFlagId, boolean>
>;
