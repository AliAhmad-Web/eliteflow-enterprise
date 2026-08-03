import { parseEnvFlag } from "@/features/ai/feature-flags";

import type { SeoFeatureFlagId, SeoFeatureFlags } from "./seo-feature-flag.types";

/**
 * Centralized EliteFlow SEO / GEO feature flags (Phase 3).
 *
 * Defaults are always OFF — existing metadata / crawl behavior unchanged
 * unless a flag is explicitly enabled.
 *
 * Rollback: unset NEXT_PUBLIC_SEO_* and restart the web app.
 */

export function isSeoEnterpriseFoundationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_SEO_ENTERPRISE_FOUNDATION,
    false,
  );
}

export function isSeoMetadataEnhancementEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_SEO_METADATA_ENHANCEMENT,
    false,
  );
}

/** Phase 2 dynamic metadata; also honors Phase 1 METADATA_ENHANCEMENT alias. */
export function isSeoDynamicMetadataEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_SEO_DYNAMIC_METADATA, false) ||
    isSeoMetadataEnhancementEnabled()
  );
}

export function isSeoOpenGraphEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SEO_OPEN_GRAPH, false);
}

export function isSeoTwitterCardsEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SEO_TWITTER_CARDS, false);
}

export function isSeoJsonLdEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SEO_JSON_LD, false);
}

/** Phase 2 structured data; also honors Phase 1 JSON_LD alias. */
export function isSeoStructuredDataEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_SEO_STRUCTURED_DATA, false) ||
    isSeoJsonLdEnabled()
  );
}

export function isSeoSitemapEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SEO_SITEMAP, false);
}

export function isSeoRobotsEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SEO_ROBOTS, false);
}

export function isSeoCanonicalEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SEO_CANONICAL, false);
}

/** Phase 2 canonical URLs; also honors Phase 1 CANONICAL alias. */
export function isSeoCanonicalUrlsEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_SEO_CANONICAL_URLS, false) ||
    isSeoCanonicalEnabled()
  );
}

export function isSeoRichResultsEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SEO_RICH_RESULTS, false);
}

export function isSeoGeoOptimizationEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SEO_GEO_OPTIMIZATION, false);
}

export function isSeoEntityOptimizationEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_SEO_ENTITY_OPTIMIZATION, false) ||
    isSeoGeoOptimizationEnabled()
  );
}

export function isSeoCitationOptimizationEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_SEO_CITATION_OPTIMIZATION, false) ||
    isSeoGeoOptimizationEnabled()
  );
}

export function isSeoKnowledgeGraphEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_SEO_KNOWLEDGE_GRAPH, false) ||
    isSeoGeoOptimizationEnabled()
  );
}

export function isSeoAiCrawlersEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_SEO_AI_CRAWLERS, false) ||
    isSeoGeoOptimizationEnabled()
  );
}

export function isSeoFeatureEnabled(flag: SeoFeatureFlagId): boolean {
  switch (flag) {
    case "SEO_ENTERPRISE_FOUNDATION":
      return isSeoEnterpriseFoundationEnabled();
    case "SEO_METADATA_ENHANCEMENT":
      return isSeoMetadataEnhancementEnabled();
    case "SEO_DYNAMIC_METADATA":
      return isSeoDynamicMetadataEnabled();
    case "SEO_OPEN_GRAPH":
      return isSeoOpenGraphEnabled();
    case "SEO_TWITTER_CARDS":
      return isSeoTwitterCardsEnabled();
    case "SEO_JSON_LD":
      return isSeoJsonLdEnabled();
    case "SEO_STRUCTURED_DATA":
      return isSeoStructuredDataEnabled();
    case "SEO_SITEMAP":
      return isSeoSitemapEnabled();
    case "SEO_ROBOTS":
      return isSeoRobotsEnabled();
    case "SEO_CANONICAL":
      return isSeoCanonicalEnabled();
    case "SEO_CANONICAL_URLS":
      return isSeoCanonicalUrlsEnabled();
    case "SEO_RICH_RESULTS":
      return isSeoRichResultsEnabled();
    case "SEO_GEO_OPTIMIZATION":
      return isSeoGeoOptimizationEnabled();
    case "SEO_ENTITY_OPTIMIZATION":
      return isSeoEntityOptimizationEnabled();
    case "SEO_CITATION_OPTIMIZATION":
      return isSeoCitationOptimizationEnabled();
    case "SEO_KNOWLEDGE_GRAPH":
      return isSeoKnowledgeGraphEnabled();
    case "SEO_AI_CRAWLERS":
      return isSeoAiCrawlersEnabled();
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

export function getSeoFeatureFlags(): SeoFeatureFlags {
  return {
    SEO_ENTERPRISE_FOUNDATION: isSeoEnterpriseFoundationEnabled(),
    SEO_METADATA_ENHANCEMENT: isSeoMetadataEnhancementEnabled(),
    SEO_DYNAMIC_METADATA: isSeoDynamicMetadataEnabled(),
    SEO_OPEN_GRAPH: isSeoOpenGraphEnabled(),
    SEO_TWITTER_CARDS: isSeoTwitterCardsEnabled(),
    SEO_JSON_LD: isSeoJsonLdEnabled(),
    SEO_STRUCTURED_DATA: isSeoStructuredDataEnabled(),
    SEO_SITEMAP: isSeoSitemapEnabled(),
    SEO_ROBOTS: isSeoRobotsEnabled(),
    SEO_CANONICAL: isSeoCanonicalEnabled(),
    SEO_CANONICAL_URLS: isSeoCanonicalUrlsEnabled(),
    SEO_RICH_RESULTS: isSeoRichResultsEnabled(),
    SEO_GEO_OPTIMIZATION: isSeoGeoOptimizationEnabled(),
    SEO_ENTITY_OPTIMIZATION: isSeoEntityOptimizationEnabled(),
    SEO_CITATION_OPTIMIZATION: isSeoCitationOptimizationEnabled(),
    SEO_KNOWLEDGE_GRAPH: isSeoKnowledgeGraphEnabled(),
    SEO_AI_CRAWLERS: isSeoAiCrawlersEnabled(),
  };
}
