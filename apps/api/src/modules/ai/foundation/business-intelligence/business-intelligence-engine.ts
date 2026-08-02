/**
 * Business Intelligence Engine — analyze existing runtime signals only.
 * Never queries databases. Never calls services. Never executes tools.
 */

import type { AiModuleDataBundle } from "../modules/data/module-data-response.js";
import type { AiBusinessQuery } from "../business-query/business-query.js";
import type { AiBusinessReasoning } from "../business-reasoning/business-reasoning.js";
import type { AiBusinessDecision } from "../business-decision/business-decision.js";
import type { AiBusinessAction } from "../business-action/business-action.js";
import type { AiBusinessWorkflow } from "../business-workflow/business-workflow.js";
import type { AiBusinessIntelligence } from "./business-intelligence.js";
import { buildBusinessKpis, sanitizeBiText } from "./business-kpis.js";
import { buildBusinessMetrics } from "./business-metrics.js";
import { buildBusinessTrends } from "./business-trends.js";
import { buildBusinessIntelligenceInsights } from "./business-insights.js";
import { buildBusinessForecast } from "./business-forecast.js";
import { buildBusinessHealth } from "./business-health.js";
import { buildBusinessOpportunities } from "./business-opportunities.js";
import { buildBusinessAlerts } from "./business-alerts.js";
import { computeOverallBiScore } from "./business-score.js";
import { buildBusinessIntelligenceSummary } from "./business-summary.js";
import { scoreBusinessIntelligenceConfidence } from "./business-confidence.js";

export interface ResolveBusinessIntelligenceInput {
  readonly moduleData?: AiModuleDataBundle | null;
  readonly businessQuery?: AiBusinessQuery | null;
  readonly businessReasoning?: AiBusinessReasoning | null;
  readonly businessDecision?: AiBusinessDecision | null;
  readonly businessAction?: AiBusinessAction | null;
  readonly businessWorkflow?: AiBusinessWorkflow | null;
}

function hasLabelSignal(
  moduleData: AiModuleDataBundle | null | undefined,
  matcher: (label: string) => boolean,
): boolean {
  for (const response of moduleData?.responses ?? []) {
    for (const item of response.summaries) {
      const label = String(item.label).toLowerCase();
      if (!matcher(label)) continue;
      const num =
        typeof item.value === "number"
          ? item.value
          : Number.parseFloat(String(item.value));
      if (Number.isFinite(num) && num > 0) return true;
    }
  }
  return false;
}

/**
 * Resolve immutable Business Intelligence from existing pipeline state.
 */
export function resolveBusinessIntelligence(
  input: ResolveBusinessIntelligenceInput,
): AiBusinessIntelligence {
  const responses = input.moduleData?.responses ?? [];
  const okResponses = responses.filter(
    (r) => r.status === "ok" || r.status === "empty",
  );
  const summaryItemCount = okResponses.reduce(
    (sum, r) => sum + r.summaries.length,
    0,
  );

  const reasoning = input.businessReasoning;
  const risks = reasoning?.risks ?? [];
  const highRisks = risks.filter((r) => r.level === "high");
  const mediumRisks = risks.filter((r) => r.level === "medium");

  const overdueSignal =
    hasLabelSignal(input.moduleData, (l) => l.includes("overdue")) ||
    (reasoning?.risks.some((r) => r.text.toLowerCase().includes("overdue")) ??
      false);
  const unreadSignal = hasLabelSignal(input.moduleData, (l) =>
    l.includes("unread"),
  );
  const openWorkloadHigh = hasLabelSignal(
    input.moduleData,
    (l) =>
      l.includes("today's tasks") ||
      l.includes("open projects") ||
      l.includes("open invoices"),
  );

  const kpis = buildBusinessKpis({
    moduleOkCount: okResponses.length,
    riskHighCount: highRisks.length,
    riskMediumCount: mediumRisks.length,
    overdueSignal,
    unreadSignal,
    decisionPriority: input.businessDecision?.priority ?? null,
  });

  const metrics = buildBusinessMetrics({
    moduleResponseCount: okResponses.length,
    summaryItemCount,
    insightCount: reasoning?.insights.length ?? 0,
    riskCount: risks.length,
    recommendationCount: reasoning?.recommendations.length ?? 0,
    workflowStepCount: input.businessWorkflow?.steps.length ?? 0,
  });

  const trends = buildBusinessTrends({
    riskHighCount: highRisks.length,
    riskMediumCount: mediumRisks.length,
    overdueSignal,
    openWorkloadHigh,
    hasReasoning: Boolean(reasoning),
  });

  const overallTrend =
    trends.find((t) => t.id === "trend.overall")?.direction ?? "unknown";

  const insights = buildBusinessIntelligenceInsights({
    reasoningInsightTexts: (reasoning?.insights ?? []).map((i) => i.text),
    riskTexts: risks.map((r) => r.text),
    recommendationTexts: (reasoning?.recommendations ?? []).map((r) => r.text),
    queryModule: input.businessQuery?.moduleName ?? null,
  });

  const forecast = buildBusinessForecast({
    overallTrend,
    riskHighCount: highRisks.length,
    executableWorkflow: input.businessWorkflow?.status === "ready",
  });

  const alerts = buildBusinessAlerts({
    riskHighTexts: highRisks.map((r) => r.text),
    riskMediumTexts: mediumRisks.map((r) => r.text),
    overdueSignal,
    decisionPriority: input.businessDecision?.priority ?? null,
  });

  const criticalAlertCount = alerts.filter(
    (a) => a.severity === "critical",
  ).length;

  const overallScore = computeOverallBiScore(kpis);

  const health = buildBusinessHealth({
    overallKpiScore: overallScore,
    riskHighCount: highRisks.length,
    criticalAlertCount,
  });

  const opportunities = buildBusinessOpportunities({
    recommendationTexts: (reasoning?.recommendations ?? []).map((r) => r.text),
    unreadSignal,
    overdueSignal,
    executableWorkflow: input.businessAction?.plan.executable ?? false,
  });

  const summary = buildBusinessIntelligenceSummary({
    healthLevel: health.level,
    overallScore,
    trendDirection: overallTrend,
    forecastOutlook: forecast.outlook,
    alertCount: alerts.filter((a) => a.severity !== "info").length,
    opportunityCount: opportunities.length,
  });

  const confidence = scoreBusinessIntelligenceConfidence({
    hasModuleData: Boolean(input.moduleData),
    hasReasoning: Boolean(reasoning),
    hasDecision: Boolean(input.businessDecision),
    hasAction: Boolean(input.businessAction),
    hasWorkflow: Boolean(input.businessWorkflow),
    kpiCount: kpis.length,
    metricCount: metrics.length,
  });

  const notes: string[] = [
    `health:${health.level}`,
    `score:${overallScore}`,
    `trend:${overallTrend}`,
    `forecast:${forecast.outlook}`,
    `alerts:${alerts.length}`,
    `opportunities:${opportunities.length}`,
  ];
  if (input.businessQuery?.intent) {
    notes.push(`query-intent:${input.businessQuery.intent}`);
  }

  return Object.freeze({
    kpis,
    metrics,
    trends,
    insights,
    forecast,
    health,
    opportunities,
    alerts,
    overallScore,
    summary: sanitizeBiText(summary, 240),
    confidence,
    notes: Object.freeze(
      [...new Set(notes.map((n) => sanitizeBiText(n, 80)))].slice(0, 12),
    ),
  });
}

export const businessIntelligenceEngine = Object.freeze({
  resolve: resolveBusinessIntelligence,
});
