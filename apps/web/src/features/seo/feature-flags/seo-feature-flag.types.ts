/**
 * SEO / GEO feature flag identifiers (Phase 3).
 * Env vars use the NEXT_PUBLIC_SEO_* prefix; defaults are always OFF.
 *
 * Phase 1 IDs retained for compatibility; Phase 2 adds implementation flags.
 */
export const SEO_FEATURE_FLAG_IDS = [
  "SEO_ENTERPRISE_FOUNDATION",
  "SEO_METADATA_ENHANCEMENT",
  "SEO_DYNAMIC_METADATA",
  "SEO_OPEN_GRAPH",
  "SEO_TWITTER_CARDS",
  "SEO_JSON_LD",
  "SEO_STRUCTURED_DATA",
  "SEO_SITEMAP",
  "SEO_ROBOTS",
  "SEO_CANONICAL",
  "SEO_CANONICAL_URLS",
  "SEO_RICH_RESULTS",
  "SEO_GEO_OPTIMIZATION",
  "SEO_ENTITY_OPTIMIZATION",
  "SEO_CITATION_OPTIMIZATION",
  "SEO_KNOWLEDGE_GRAPH",
  "SEO_AI_CRAWLERS",
] as const;

export type SeoFeatureFlagId = (typeof SEO_FEATURE_FLAG_IDS)[number];

/** Snapshot of all SEO flags (all default false). */
export type SeoFeatureFlags = Readonly<Record<SeoFeatureFlagId, boolean>>;
