/**
 * Business Decision Engine — decide from existing reasoning only.
 * Never queries databases. Never calls services. Never executes tools.
 */

import type { AiBusinessQuery } from "../business-query/business-query.js";
import type { AiBusinessReasoning } from "../business-reasoning/business-reasoning.js";
import type { AiBusinessDecision } from "./business-decision.js";
import type { AiBusinessDecisionExecutionMode } from "./business-decision.js";
import { evaluateBusinessDecisionSignals } from "./decision-evaluation.js";
import { scoreDecisionOptions } from "./decision-scoring.js";
import { resolveDecisionPriority } from "./decision-priority.js";
import { resolveDecisionImpact } from "./decision-impact.js";
import { resolveDecisionRisk } from "./decision-risk.js";
import { resolveDecisionRecommendation } from "./decision-recommendation.js";
import { scoreBusinessDecisionConfidence } from "./decision-confidence.js";
import { sanitizeDecisionText } from "./decision-options.js";

export interface ResolveBusinessDecisionInput {
  readonly businessReasoning?: AiBusinessReasoning | null;
  readonly businessQuery?: AiBusinessQuery | null;
}

function resolveExecutionMode(
  priority: AiBusinessDecision["priority"],
): AiBusinessDecisionExecutionMode {
  switch (priority) {
    case "critical":
      return "escalate";
    case "high":
    case "medium":
      return "recommend";
    case "low":
      return "advise-only";
    default: {
      const _exhaustive: never = priority;
      return _exhaustive;
    }
  }
}

/**
 * Resolve an immutable Business Decision from existing runtime reasoning.
 */
export function resolveBusinessDecision(
  input: ResolveBusinessDecisionInput,
): AiBusinessDecision {
  const evaluation = evaluateBusinessDecisionSignals({
    reasoning: input.businessReasoning,
    businessQuery: input.businessQuery,
  });

  const options = scoreDecisionOptions(input.businessReasoning);
  const priority = resolveDecisionPriority({
    highRiskCount: evaluation.highRiskCount,
    mediumRiskCount: evaluation.mediumRiskCount,
    highRecommendationCount: evaluation.highRecommendationCount,
    highUrgencyCount: evaluation.highUrgencyCount,
  });

  const risk = resolveDecisionRisk({
    highRiskCount: evaluation.highRiskCount,
    mediumRiskCount: evaluation.mediumRiskCount,
    lowRiskCount: evaluation.lowRiskCount,
    topRiskText: evaluation.topRiskText,
  });

  const impact = resolveDecisionImpact({
    priority,
    insightCount: evaluation.insightCount,
    riskCount: evaluation.riskCount,
  });

  const recommendation = resolveDecisionRecommendation({
    priority,
    riskLevel: risk.level,
    topRecommendationText: evaluation.topRecommendationText,
    topPriorityText: evaluation.topPriorityText,
  });

  const confidence = scoreBusinessDecisionConfidence({
    hasReasoning: Boolean(input.businessReasoning),
    reasoningConfidence: input.businessReasoning?.confidence ?? 0,
    optionCount: options.length,
    riskCount: evaluation.riskCount,
    recommendationCount: evaluation.recommendationCount,
    hasBusinessQuery: Boolean(input.businessQuery),
  });

  const selected = options[0] ?? null;
  const mode = resolveExecutionMode(priority);

  const notes: string[] = [
    `priority:${priority}`,
    `risk:${risk.level}`,
    `impact:${impact.level}`,
    `options:${options.length}`,
  ];
  if (evaluation.queryIntent) {
    notes.push(`query-intent:${evaluation.queryIntent}`);
  }
  if (evaluation.queryModule) {
    notes.push(
      sanitizeDecisionText(`query-module:${evaluation.queryModule}`, 60),
    );
  }
  if (selected) {
    notes.push(`selected:${selected.id}`);
  }

  return Object.freeze({
    options,
    priority,
    impact,
    risk,
    recommendation,
    confidence,
    reasoningSummary: sanitizeDecisionText(evaluation.reasoningSummary, 200),
    execution: Object.freeze({
      mode,
      selectedOptionId: selected?.id ?? null,
      requiresConfirmation: mode === "escalate" || priority === "high",
      actionable: mode !== "advise-only",
    }),
    notes: Object.freeze(
      [...new Set(notes.map((n) => sanitizeDecisionText(n, 80)))].slice(0, 12),
    ),
  });
}

export const businessDecisionEngine = Object.freeze({
  resolve: resolveBusinessDecision,
});
