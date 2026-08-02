/**
 * AI Analytics / Reports feature flag identifiers (Task 1.3 Phase 1).
 * Env vars use the NEXT_PUBLIC_AI_ANALYTICS_* prefix; defaults are always OFF.
 */
export const AI_ANALYTICS_FEATURE_FLAG_IDS = [
  "AI_ANALYTICS_ENTERPRISE_SHELL",
  "AI_ANALYTICS_ENHANCED_KPIS",
  "AI_ANALYTICS_INSIGHT_CARDS",
  "AI_ANALYTICS_BUSINESS_SUMMARY",
  "AI_ANALYTICS_TREND_ENHANCEMENTS",
  "AI_ANALYTICS_RECOMMENDATION_CARDS",
  "AI_ANALYTICS_ACTIVITY_TIMELINE",
  "AI_ANALYTICS_ADVANCED_FILTERS",
  "AI_ANALYTICS_REFRESH",
  "AI_ANALYTICS_SKELETONS",
  "AI_ANALYTICS_ENHANCED_FEEDBACK",
] as const;

export type AiAnalyticsFeatureFlagId =
  (typeof AI_ANALYTICS_FEATURE_FLAG_IDS)[number];

/** Snapshot of all AI Analytics flags (all default false). */
export type AiAnalyticsFeatureFlags = Readonly<
  Record<AiAnalyticsFeatureFlagId, boolean>
>;
