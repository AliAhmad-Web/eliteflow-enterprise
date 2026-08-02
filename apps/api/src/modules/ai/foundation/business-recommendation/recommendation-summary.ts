/**
 * Recommendation summary helpers.
 */

import type { AiBusinessRecommendationPriority } from "./recommendation-priority.js";
import { formatRecommendationPriority } from "./recommendation-priority.js";
import type { AiBusinessRecommendationImpactLevel } from "./recommendation-impact.js";
import { formatRecommendationImpactLevel } from "./recommendation-impact.js";

export function buildRecommendationSummary(input: {
  readonly itemCount: number;
  readonly priority: AiBusinessRecommendationPriority;
  readonly impactLevel: AiBusinessRecommendationImpactLevel;
  readonly topText?: string | null;
}): string {
  const focus = input.topText?.trim().slice(0, 80) ?? "";
  const base = [
    `${input.itemCount} recommendation${input.itemCount === 1 ? "" : "s"}`,
    `priority ${formatRecommendationPriority(input.priority)}`,
    `impact ${formatRecommendationImpactLevel(input.impactLevel)}`,
  ].join("; ");
  return focus ? `${base}. Focus: ${focus}` : `${base}.`;
}
