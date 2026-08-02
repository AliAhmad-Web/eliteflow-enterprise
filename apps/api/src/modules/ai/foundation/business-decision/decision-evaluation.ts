/**
 * Business Decision evaluation — aggregate reasoning into decision inputs.
 */

import type { AiBusinessReasoning } from "../business-reasoning/business-reasoning.js";
import type { AiBusinessQuery } from "../business-query/business-query.js";

export interface AiBusinessDecisionEvaluation {
  readonly highRiskCount: number;
  readonly mediumRiskCount: number;
  readonly lowRiskCount: number;
  readonly highRecommendationCount: number;
  readonly highUrgencyCount: number;
  readonly insightCount: number;
  readonly riskCount: number;
  readonly recommendationCount: number;
  readonly topRiskText: string | null;
  readonly topRecommendationText: string | null;
  readonly topPriorityText: string | null;
  readonly reasoningSummary: string;
  readonly queryIntent: string | null;
  readonly queryModule: string | null;
}

export function evaluateBusinessDecisionSignals(input: {
  readonly reasoning?: AiBusinessReasoning | null;
  readonly businessQuery?: AiBusinessQuery | null;
}): AiBusinessDecisionEvaluation {
  const reasoning = input.reasoning;
  const risks = reasoning?.risks ?? [];
  const recommendations = reasoning?.recommendations ?? [];
  const priorities = reasoning?.priorities ?? [];
  const insights = reasoning?.insights ?? [];

  const highRisks = risks.filter((r) => r.level === "high");
  const mediumRisks = risks.filter((r) => r.level === "medium");
  const lowRisks = risks.filter((r) => r.level === "low");

  return Object.freeze({
    highRiskCount: highRisks.length,
    mediumRiskCount: mediumRisks.length,
    lowRiskCount: lowRisks.length,
    highRecommendationCount: recommendations.filter((r) => r.priority === "high")
      .length,
    highUrgencyCount: priorities.filter((p) => p.urgency === "high").length,
    insightCount: insights.length,
    riskCount: risks.length,
    recommendationCount: recommendations.length,
    topRiskText: highRisks[0]?.text ?? mediumRisks[0]?.text ?? null,
    topRecommendationText:
      recommendations.find((r) => r.priority === "high")?.text ??
      recommendations[0]?.text ??
      null,
    topPriorityText:
      priorities.find((p) => p.urgency === "high")?.text ??
      priorities[0]?.text ??
      null,
    reasoningSummary: reasoning?.summary?.trim() || "No reasoning summary",
    queryIntent: input.businessQuery?.intent ?? null,
    queryModule: input.businessQuery?.moduleName ?? null,
  });
}
