/**
 * Business Execution Engine — consume Business Recommendations only.
 * Never executes. Never calls services/providers. Never accesses database.
 */

import type { AiBusinessRecommendation } from "../business-recommendation/business-recommendation.js";
import type { AiBusinessExecution } from "./business-execution.js";
import { buildExecutionPhases } from "./execution-phases.js";
import { buildExecutionMilestones } from "./execution-milestones.js";
import { buildExecutionDependencies } from "./execution-dependencies.js";
import { buildExecutionResources } from "./execution-resources.js";
import { buildExecutionTimeline } from "./execution-timeline.js";
import { buildExecutionKpis } from "./execution-kpis.js";
import { buildExecutionRisks } from "./execution-risks.js";
import { buildExecutionRollbackPlan } from "./execution-rollbacks.js";
import { buildExecutionPlan } from "./execution-plan.js";
import { scoreExecutionConfidence } from "./execution-confidence.js";
import {
  buildExecutionSummary,
  sanitizeExecutionText,
} from "./execution-summary.js";

export interface ResolveBusinessExecutionInput {
  readonly businessRecommendation?: AiBusinessRecommendation | null;
}

/**
 * Resolve an immutable Business Execution plan from recommendations.
 */
export function resolveBusinessExecution(
  input: ResolveBusinessExecutionInput,
): AiBusinessExecution {
  const recommendation = input.businessRecommendation ?? null;
  const items = recommendation?.items ?? [];
  const priority = recommendation?.priority ?? "low";
  const elevatedRisks =
    recommendation?.risks.filter((r) => r.level === "high") ?? [];
  const requiresConfirmation =
    priority === "critical" || priority === "high";

  const phases = buildExecutionPhases({
    recommendationCount: items.length,
    priority,
    hasCriticalRisk: elevatedRisks.length > 0,
  });

  const milestones = buildExecutionMilestones(phases);
  const dependencies = buildExecutionDependencies({
    phases,
    requiresConfirmation,
  });

  const plan = buildExecutionPlan({
    phases,
    milestones,
    dependencies,
    priority,
    recommendationCount: items.length,
  });

  const timeline = buildExecutionTimeline({
    priority,
    phaseCount: phases.length,
    milestoneCount: milestones.length,
  });

  const resources = buildExecutionResources({
    priority,
    recommendationCount: items.length,
  });

  const kpis = buildExecutionKpis({
    recommendationCount: items.length,
    priority,
  });

  const risks = buildExecutionRisks({
    recommendationRiskTexts: elevatedRisks.map((r) => r.text),
    priority,
  });

  const rollback = buildExecutionRollbackPlan({
    phaseCount: phases.length,
    requiresConfirmation,
  });

  const confidence = scoreExecutionConfidence({
    hasRecommendation: Boolean(recommendation),
    recommendationConfidence: recommendation?.confidence ?? 0,
    phaseCount: phases.length,
    milestoneCount: milestones.length,
    dependencyCount: dependencies.length,
    hasRollback: rollback.steps.length > 0,
  });

  const summary = buildExecutionSummary({
    phaseCount: phases.length,
    milestoneCount: milestones.length,
    horizon: timeline.horizon,
    recommendationCount: items.length,
    topRecommendation: items[0]?.text,
  });

  const notes: string[] = [
    `plan:${plan.id}`,
    `phases:${phases.length}`,
    `milestones:${milestones.length}`,
    `dependencies:${dependencies.length}`,
    `horizon:${timeline.horizon}`,
    `executable:${plan.executable ? "yes" : "no"}`,
  ];
  if (recommendation?.priority) {
    notes.push(`rec-priority:${recommendation.priority}`);
  }

  return Object.freeze({
    plan,
    timeline,
    resources,
    kpis,
    risks,
    rollback,
    confidence,
    summary: sanitizeExecutionText(summary, 240),
    notes: Object.freeze(
      [...new Set(notes.map((n) => sanitizeExecutionText(n, 80)))].slice(0, 12),
    ),
  });
}

export const businessExecutionEngine = Object.freeze({
  resolve: resolveBusinessExecution,
});
