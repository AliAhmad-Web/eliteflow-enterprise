/**
 * Business Recommendation Engine — consume Business Intelligence only.
 * Never executes. Never calls services/providers. Never accesses database.
 */

import type { AiBusinessIntelligence } from "../business-intelligence/business-intelligence.js";
import type {
  AiBusinessRecommendation,
  AiBusinessRecommendationItem,
} from "./business-recommendation.js";
import type { AiBusinessRecommendationCategory } from "./recommendation-categories.js";
import { sanitizeRecommendationText } from "./recommendation-categories.js";
import { resolveRecommendationPriority } from "./recommendation-priority.js";
import { resolveRecommendationImpact } from "./recommendation-impact.js";
import { buildRecommendationBenefits } from "./recommendation-benefits.js";
import { buildRecommendationRisks } from "./recommendation-risks.js";
import { scoreRecommendationConfidence } from "./recommendation-confidence.js";
import { buildRecommendationSummary } from "./recommendation-summary.js";

export interface ResolveBusinessRecommendationInput {
  readonly businessIntelligence?: AiBusinessIntelligence | null;
}

function pushItem(
  items: AiBusinessRecommendationItem[],
  input: {
    readonly id: string;
    readonly category: AiBusinessRecommendationCategory;
    readonly priority: AiBusinessRecommendationItem["priority"];
    readonly text: string;
  },
): void {
  items.push(
    Object.freeze({
      id: input.id,
      category: input.category,
      priority: input.priority,
      text: sanitizeRecommendationText(input.text, 140),
    }),
  );
}

/**
 * Resolve immutable Business Recommendations from Business Intelligence.
 */
export function resolveBusinessRecommendation(
  input: ResolveBusinessRecommendationInput,
): AiBusinessRecommendation {
  const bi = input.businessIntelligence ?? null;
  const criticalAlerts =
    bi?.alerts.filter((a) => a.severity === "critical") ?? [];
  const warningAlerts =
    bi?.alerts.filter((a) => a.severity === "warning") ?? [];
  const opportunities = bi?.opportunities ?? [];

  const overallPriority = resolveRecommendationPriority({
    healthLevel: bi?.health.level ?? null,
    hasCriticalAlert: criticalAlerts.length > 0,
    forecastOutlook: bi?.forecast.outlook ?? null,
  });

  const items: AiBusinessRecommendationItem[] = [];

  // Executive
  if (bi) {
    pushItem(items, {
      id: "rec.executive.health",
      category: "executive",
      priority: overallPriority,
      text: `Executive focus: ${bi.health.summary}`,
    });
  } else {
    pushItem(items, {
      id: "rec.executive.none",
      category: "executive",
      priority: "low",
      text: "No business intelligence available for executive recommendations",
    });
  }

  // Risk
  for (const [index, alert] of criticalAlerts.slice(0, 2).entries()) {
    pushItem(items, {
      id: `rec.risk.${index + 1}`,
      category: "risk",
      priority: "critical",
      text: `Address critical alert: ${alert.text}`,
    });
  }

  // Operational / productivity
  const workloadKpi = bi?.kpis.find((k) => k.id === "kpi.workload");
  if (workloadKpi && workloadKpi.status !== "healthy") {
    pushItem(items, {
      id: "rec.operational.workload",
      category: "operational",
      priority: workloadKpi.status === "critical" ? "high" : "medium",
      text: "Improve operational throughput by clearing elevated workload signals",
    });
    pushItem(items, {
      id: "rec.productivity.workload",
      category: "productivity",
      priority: "medium",
      text: "Prioritize high-impact tasks to lift productivity KPIs",
    });
  }

  // Strategic / forecast
  if (bi?.forecast.outlook === "negative" || bi?.forecast.outlook === "cautious") {
    pushItem(items, {
      id: "rec.strategic.forecast",
      category: "strategic",
      priority: bi.forecast.outlook === "negative" ? "high" : "medium",
      text: `Strategic response to ${bi.forecast.outlook} near-term forecast`,
    });
  }

  // Cost / resource optimization
  if ((bi?.overallScore ?? 100) < 60) {
    pushItem(items, {
      id: "rec.cost.optimize",
      category: "cost_optimization",
      priority: "medium",
      text: "Review cost drivers tied to underperforming KPI areas",
    });
    pushItem(items, {
      id: "rec.resource.optimize",
      category: "resource_optimization",
      priority: "medium",
      text: "Reallocate resources toward highest-priority business signals",
    });
  }

  // Opportunities
  for (const [index, opp] of opportunities.slice(0, 3).entries()) {
    pushItem(items, {
      id: `rec.opportunity.${index + 1}`,
      category: "opportunity",
      priority: opp.priority === "high" ? "high" : "medium",
      text: opp.text,
    });
  }

  const limitedItems = Object.freeze(items.slice(0, 12));

  const impact = resolveRecommendationImpact({
    priority: overallPriority,
    opportunityCount: opportunities.length,
    alertCount: criticalAlerts.length + warningAlerts.length,
  });

  const benefits = buildRecommendationBenefits({
    healthLevel: bi?.health.level ?? null,
    overallScore: bi?.overallScore ?? 50,
    opportunityTexts: opportunities.map((o) => o.text),
  });

  const risks = buildRecommendationRisks({
    criticalAlertTexts: criticalAlerts.map((a) => a.text),
    warningAlertTexts: warningAlerts.map((a) => a.text),
    forecastOutlook: bi?.forecast.outlook ?? null,
  });

  const confidence = scoreRecommendationConfidence({
    hasIntelligence: Boolean(bi),
    intelligenceConfidence: bi?.confidence ?? 0,
    itemCount: limitedItems.length,
    hasCriticalAlerts: criticalAlerts.length > 0,
    hasOpportunities: opportunities.length > 0,
  });

  const summary = buildRecommendationSummary({
    itemCount: limitedItems.length,
    priority: overallPriority,
    impactLevel: impact.level,
    topText: limitedItems[0]?.text,
  });

  const notes: string[] = [
    `priority:${overallPriority}`,
    `impact:${impact.level}`,
    `items:${limitedItems.length}`,
    `benefits:${benefits.length}`,
    `risks:${risks.length}`,
  ];
  if (bi?.health.level) notes.push(`health:${bi.health.level}`);
  if (bi?.forecast.outlook) notes.push(`forecast:${bi.forecast.outlook}`);

  return Object.freeze({
    items: limitedItems,
    priority: overallPriority,
    impact,
    benefits,
    risks,
    confidence,
    summary: sanitizeRecommendationText(summary, 240),
    notes: Object.freeze(
      [...new Set(notes.map((n) => sanitizeRecommendationText(n, 80)))].slice(
        0,
        12,
      ),
    ),
  });
}

export const businessRecommendationEngine = Object.freeze({
  resolve: resolveBusinessRecommendation,
});
