import { parseEnvFlag } from "@/features/ai/feature-flags";

import type {
  AiBiFeatureFlagId,
  AiBiFeatureFlags,
} from "./ai-bi-feature-flag.types";

/**
 * EliteFlow AI Analytics & Business Intelligence flags (Phase 6).
 * Defaults OFF. Phase 2 wires presentation behind these flags.
 */

export function isAiBiEnterpriseFoundationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_ENTERPRISE_FOUNDATION,
    false,
  );
}

export function isAiBiExecutiveKpisEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_BI_EXECUTIVE_KPIS, false);
}

export function isAiBiHealthScoreEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_BI_HEALTH_SCORE, false);
}

export function isAiBiOperationalSummariesEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_OPERATIONAL_SUMMARIES,
    false,
  );
}

export function isAiBiDepartmentSummariesEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_DEPARTMENT_SUMMARIES,
    false,
  );
}

export function isAiBiRevenueIntelligenceEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_REVENUE_INTELLIGENCE,
    false,
  );
}

export function isAiBiClientIntelligenceEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_CLIENT_INTELLIGENCE,
    false,
  );
}

export function isAiBiProjectIntelligenceEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_PROJECT_INTELLIGENCE,
    false,
  );
}

export function isAiBiTeamProductivityEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_TEAM_PRODUCTIVITY,
    false,
  );
}

export function isAiBiInvoiceIntelligenceEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_INVOICE_INTELLIGENCE,
    false,
  );
}

export function isAiBiAiBusinessSummariesEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_AI_BUSINESS_SUMMARIES,
    false,
  );
}

export function isAiBiInsightPrioritizationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_INSIGHT_PRIORITIZATION,
    false,
  );
}

export function isAiBiInsightCategoriesEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_INSIGHT_CATEGORIES,
    false,
  );
}

export function isAiBiRecommendationGroupingEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_RECOMMENDATION_GROUPING,
    false,
  );
}

export function isAiBiHistoricalComparisonEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_HISTORICAL_COMPARISON,
    false,
  );
}

export function isAiBiTrendCompositionEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_TREND_COMPOSITION,
    false,
  );
}

export function isAiBiReportCompositionEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_REPORT_COMPOSITION,
    false,
  );
}

export function isAiBiSavedReportEvolutionEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_SAVED_REPORT_EVOLUTION,
    false,
  );
}

export function isAiBiExportEnhancementsEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_EXPORT_ENHANCEMENTS,
    false,
  );
}

export function isAiBiFilterConsistencyEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_BI_FILTER_CONSISTENCY,
    false,
  );
}

export function isAiBiDrillDownEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_BI_DRILL_DOWN, false);
}

/** Phase 2 brief: executive summary (also honors Phase 1 aliases). */
export function isAiBiExecutiveSummaryEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_AI_BI_EXECUTIVE_SUMMARY, false) ||
    isAiBiAiBusinessSummariesEnabled() ||
    isAiBiExecutiveKpisEnabled() ||
    isAiBiOperationalSummariesEnabled()
  );
}

/** Phase 2 brief: business health (also honors HEALTH_SCORE). */
export function isAiBiBusinessHealthEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_AI_BI_BUSINESS_HEALTH, false) ||
    isAiBiHealthScoreEnabled()
  );
}

/** Phase 2 brief: department intelligence (also honors domain Phase 1 flags). */
export function isAiBiDepartmentIntelligenceEnabled(): boolean {
  return (
    parseEnvFlag(
      process.env.NEXT_PUBLIC_AI_BI_DEPARTMENT_INTELLIGENCE,
      false,
    ) ||
    isAiBiDepartmentSummariesEnabled() ||
    isAiBiRevenueIntelligenceEnabled() ||
    isAiBiClientIntelligenceEnabled() ||
    isAiBiProjectIntelligenceEnabled() ||
    isAiBiTeamProductivityEnabled() ||
    isAiBiInvoiceIntelligenceEnabled()
  );
}

/** Phase 2 brief: recommendation groups (also honors RECOMMENDATION_GROUPING). */
export function isAiBiRecommendationsEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_AI_BI_RECOMMENDATIONS, false) ||
    isAiBiRecommendationGroupingEnabled()
  );
}

/** Phase 2 brief: historical compare (also honors HISTORICAL_COMPARISON). */
export function isAiBiHistoryCompareEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_AI_BI_HISTORY_COMPARE, false) ||
    isAiBiHistoricalComparisonEnabled()
  );
}

/** Phase 2 brief: report layout (also honors REPORT_COMPOSITION). */
export function isAiBiReportLayoutEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_AI_BI_REPORT_LAYOUT, false) ||
    isAiBiReportCompositionEnabled()
  );
}

/** Phase 2 brief: saved reports UX (also honors SAVED_REPORT_EVOLUTION). */
export function isAiBiSavedReportsEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_AI_BI_SAVED_REPORTS, false) ||
    isAiBiSavedReportEvolutionEnabled()
  );
}

/** Phase 2 brief: export UX (also honors EXPORT_ENHANCEMENTS). */
export function isAiBiExportExperienceEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_AI_BI_EXPORT_EXPERIENCE, false) ||
    isAiBiExportEnhancementsEnabled()
  );
}

/** True when any Phase 2 BI presentation flag is ON (modular shell). */
export function isAiBiPresentationEnabled(): boolean {
  return (
    isAiBiExecutiveSummaryEnabled() ||
    isAiBiBusinessHealthEnabled() ||
    isAiBiDepartmentIntelligenceEnabled() ||
    isAiBiRecommendationsEnabled() ||
    isAiBiHistoryCompareEnabled() ||
    isAiBiReportLayoutEnabled() ||
    isAiBiSavedReportsEnabled() ||
    isAiBiExportExperienceEnabled()
  );
}

export function isAiBiFeatureEnabled(flag: AiBiFeatureFlagId): boolean {
  switch (flag) {
    case "AI_BI_ENTERPRISE_FOUNDATION":
      return isAiBiEnterpriseFoundationEnabled();
    case "AI_BI_EXECUTIVE_KPIS":
      return isAiBiExecutiveKpisEnabled();
    case "AI_BI_HEALTH_SCORE":
      return isAiBiHealthScoreEnabled();
    case "AI_BI_OPERATIONAL_SUMMARIES":
      return isAiBiOperationalSummariesEnabled();
    case "AI_BI_DEPARTMENT_SUMMARIES":
      return isAiBiDepartmentSummariesEnabled();
    case "AI_BI_REVENUE_INTELLIGENCE":
      return isAiBiRevenueIntelligenceEnabled();
    case "AI_BI_CLIENT_INTELLIGENCE":
      return isAiBiClientIntelligenceEnabled();
    case "AI_BI_PROJECT_INTELLIGENCE":
      return isAiBiProjectIntelligenceEnabled();
    case "AI_BI_TEAM_PRODUCTIVITY":
      return isAiBiTeamProductivityEnabled();
    case "AI_BI_INVOICE_INTELLIGENCE":
      return isAiBiInvoiceIntelligenceEnabled();
    case "AI_BI_AI_BUSINESS_SUMMARIES":
      return isAiBiAiBusinessSummariesEnabled();
    case "AI_BI_INSIGHT_PRIORITIZATION":
      return isAiBiInsightPrioritizationEnabled();
    case "AI_BI_INSIGHT_CATEGORIES":
      return isAiBiInsightCategoriesEnabled();
    case "AI_BI_RECOMMENDATION_GROUPING":
      return isAiBiRecommendationGroupingEnabled();
    case "AI_BI_HISTORICAL_COMPARISON":
      return isAiBiHistoricalComparisonEnabled();
    case "AI_BI_TREND_COMPOSITION":
      return isAiBiTrendCompositionEnabled();
    case "AI_BI_REPORT_COMPOSITION":
      return isAiBiReportCompositionEnabled();
    case "AI_BI_SAVED_REPORT_EVOLUTION":
      return isAiBiSavedReportEvolutionEnabled();
    case "AI_BI_EXPORT_ENHANCEMENTS":
      return isAiBiExportEnhancementsEnabled();
    case "AI_BI_FILTER_CONSISTENCY":
      return isAiBiFilterConsistencyEnabled();
    case "AI_BI_DRILL_DOWN":
      return isAiBiDrillDownEnabled();
    case "AI_BI_EXECUTIVE_SUMMARY":
      return isAiBiExecutiveSummaryEnabled();
    case "AI_BI_BUSINESS_HEALTH":
      return isAiBiBusinessHealthEnabled();
    case "AI_BI_DEPARTMENT_INTELLIGENCE":
      return isAiBiDepartmentIntelligenceEnabled();
    case "AI_BI_RECOMMENDATIONS":
      return isAiBiRecommendationsEnabled();
    case "AI_BI_HISTORY_COMPARE":
      return isAiBiHistoryCompareEnabled();
    case "AI_BI_REPORT_LAYOUT":
      return isAiBiReportLayoutEnabled();
    case "AI_BI_SAVED_REPORTS":
      return isAiBiSavedReportsEnabled();
    case "AI_BI_EXPORT_EXPERIENCE":
      return isAiBiExportExperienceEnabled();
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

export function getAiBiFeatureFlags(): AiBiFeatureFlags {
  return {
    AI_BI_ENTERPRISE_FOUNDATION: isAiBiEnterpriseFoundationEnabled(),
    AI_BI_EXECUTIVE_KPIS: isAiBiExecutiveKpisEnabled(),
    AI_BI_HEALTH_SCORE: isAiBiHealthScoreEnabled(),
    AI_BI_OPERATIONAL_SUMMARIES: isAiBiOperationalSummariesEnabled(),
    AI_BI_DEPARTMENT_SUMMARIES: isAiBiDepartmentSummariesEnabled(),
    AI_BI_REVENUE_INTELLIGENCE: isAiBiRevenueIntelligenceEnabled(),
    AI_BI_CLIENT_INTELLIGENCE: isAiBiClientIntelligenceEnabled(),
    AI_BI_PROJECT_INTELLIGENCE: isAiBiProjectIntelligenceEnabled(),
    AI_BI_TEAM_PRODUCTIVITY: isAiBiTeamProductivityEnabled(),
    AI_BI_INVOICE_INTELLIGENCE: isAiBiInvoiceIntelligenceEnabled(),
    AI_BI_AI_BUSINESS_SUMMARIES: isAiBiAiBusinessSummariesEnabled(),
    AI_BI_INSIGHT_PRIORITIZATION: isAiBiInsightPrioritizationEnabled(),
    AI_BI_INSIGHT_CATEGORIES: isAiBiInsightCategoriesEnabled(),
    AI_BI_RECOMMENDATION_GROUPING: isAiBiRecommendationGroupingEnabled(),
    AI_BI_HISTORICAL_COMPARISON: isAiBiHistoricalComparisonEnabled(),
    AI_BI_TREND_COMPOSITION: isAiBiTrendCompositionEnabled(),
    AI_BI_REPORT_COMPOSITION: isAiBiReportCompositionEnabled(),
    AI_BI_SAVED_REPORT_EVOLUTION: isAiBiSavedReportEvolutionEnabled(),
    AI_BI_EXPORT_ENHANCEMENTS: isAiBiExportEnhancementsEnabled(),
    AI_BI_FILTER_CONSISTENCY: isAiBiFilterConsistencyEnabled(),
    AI_BI_DRILL_DOWN: isAiBiDrillDownEnabled(),
    AI_BI_EXECUTIVE_SUMMARY: isAiBiExecutiveSummaryEnabled(),
    AI_BI_BUSINESS_HEALTH: isAiBiBusinessHealthEnabled(),
    AI_BI_DEPARTMENT_INTELLIGENCE: isAiBiDepartmentIntelligenceEnabled(),
    AI_BI_RECOMMENDATIONS: isAiBiRecommendationsEnabled(),
    AI_BI_HISTORY_COMPARE: isAiBiHistoryCompareEnabled(),
    AI_BI_REPORT_LAYOUT: isAiBiReportLayoutEnabled(),
    AI_BI_SAVED_REPORTS: isAiBiSavedReportsEnabled(),
    AI_BI_EXPORT_EXPERIENCE: isAiBiExportExperienceEnabled(),
  };
}
