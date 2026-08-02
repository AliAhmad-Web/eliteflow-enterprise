import type {
  AiAnalyticsFeatureFlagId,
  AiAnalyticsFeatureFlags,
} from "./ai-analytics-feature-flag.types";
import { parseEnvFlag } from "@/features/ai/feature-flags";

/**
 * Centralized AI Analytics / Reports feature flags (Task 1.3).
 *
 * Uses Next.js NEXT_PUBLIC_AI_ANALYTICS_* env vars with static access.
 * Defaults are always OFF — existing /reports behavior unchanged.
 *
 * Rollback: set the corresponding NEXT_PUBLIC_AI_ANALYTICS_* var to false/unset
 * and restart the web app.
 */

export function isAiAnalyticsEnterpriseShellEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_ANALYTICS_ENTERPRISE_SHELL,
    false,
  );
}

export function isAiAnalyticsEnhancedKpisEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_ANALYTICS_ENHANCED_KPIS,
    false,
  );
}

export function isAiAnalyticsInsightCardsEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_ANALYTICS_INSIGHT_CARDS,
    false,
  );
}

export function isAiAnalyticsBusinessSummaryEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_ANALYTICS_BUSINESS_SUMMARY,
    false,
  );
}

export function isAiAnalyticsTrendEnhancementsEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_ANALYTICS_TREND_ENHANCEMENTS,
    false,
  );
}

export function isAiAnalyticsRecommendationCardsEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_ANALYTICS_RECOMMENDATION_CARDS,
    false,
  );
}

export function isAiAnalyticsActivityTimelineEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_ANALYTICS_ACTIVITY_TIMELINE,
    false,
  );
}

export function isAiAnalyticsAdvancedFiltersEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_ANALYTICS_ADVANCED_FILTERS,
    false,
  );
}

export function isAiAnalyticsRefreshEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_ANALYTICS_REFRESH, false);
}

export function isAiAnalyticsSkeletonsEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_ANALYTICS_SKELETONS, false);
}

export function isAiAnalyticsEnhancedFeedbackEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_ANALYTICS_ENHANCED_FEEDBACK,
    false,
  );
}

export function isAiAnalyticsFeatureEnabled(
  flag: AiAnalyticsFeatureFlagId,
): boolean {
  switch (flag) {
    case "AI_ANALYTICS_ENTERPRISE_SHELL":
      return isAiAnalyticsEnterpriseShellEnabled();
    case "AI_ANALYTICS_ENHANCED_KPIS":
      return isAiAnalyticsEnhancedKpisEnabled();
    case "AI_ANALYTICS_INSIGHT_CARDS":
      return isAiAnalyticsInsightCardsEnabled();
    case "AI_ANALYTICS_BUSINESS_SUMMARY":
      return isAiAnalyticsBusinessSummaryEnabled();
    case "AI_ANALYTICS_TREND_ENHANCEMENTS":
      return isAiAnalyticsTrendEnhancementsEnabled();
    case "AI_ANALYTICS_RECOMMENDATION_CARDS":
      return isAiAnalyticsRecommendationCardsEnabled();
    case "AI_ANALYTICS_ACTIVITY_TIMELINE":
      return isAiAnalyticsActivityTimelineEnabled();
    case "AI_ANALYTICS_ADVANCED_FILTERS":
      return isAiAnalyticsAdvancedFiltersEnabled();
    case "AI_ANALYTICS_REFRESH":
      return isAiAnalyticsRefreshEnabled();
    case "AI_ANALYTICS_SKELETONS":
      return isAiAnalyticsSkeletonsEnabled();
    case "AI_ANALYTICS_ENHANCED_FEEDBACK":
      return isAiAnalyticsEnhancedFeedbackEnabled();
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

export function getAiAnalyticsFeatureFlags(): AiAnalyticsFeatureFlags {
  return {
    AI_ANALYTICS_ENTERPRISE_SHELL: isAiAnalyticsEnterpriseShellEnabled(),
    AI_ANALYTICS_ENHANCED_KPIS: isAiAnalyticsEnhancedKpisEnabled(),
    AI_ANALYTICS_INSIGHT_CARDS: isAiAnalyticsInsightCardsEnabled(),
    AI_ANALYTICS_BUSINESS_SUMMARY: isAiAnalyticsBusinessSummaryEnabled(),
    AI_ANALYTICS_TREND_ENHANCEMENTS: isAiAnalyticsTrendEnhancementsEnabled(),
    AI_ANALYTICS_RECOMMENDATION_CARDS:
      isAiAnalyticsRecommendationCardsEnabled(),
    AI_ANALYTICS_ACTIVITY_TIMELINE: isAiAnalyticsActivityTimelineEnabled(),
    AI_ANALYTICS_ADVANCED_FILTERS: isAiAnalyticsAdvancedFiltersEnabled(),
    AI_ANALYTICS_REFRESH: isAiAnalyticsRefreshEnabled(),
    AI_ANALYTICS_SKELETONS: isAiAnalyticsSkeletonsEnabled(),
    AI_ANALYTICS_ENHANCED_FEEDBACK: isAiAnalyticsEnhancedFeedbackEnabled(),
  };
}
