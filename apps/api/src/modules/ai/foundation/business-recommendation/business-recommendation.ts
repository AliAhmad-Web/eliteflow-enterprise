/**
 * Immutable Enterprise Business Recommendation model.
 * Structured recommendations from Business Intelligence — never executes.
 */

import type { AiBusinessRecommendationCategory } from "./recommendation-categories.js";
import type { AiBusinessRecommendationPriority } from "./recommendation-priority.js";
import type { AiBusinessRecommendationImpact } from "./recommendation-impact.js";
import type { AiBusinessRecommendationBenefit } from "./recommendation-benefits.js";
import type { AiBusinessRecommendationRisk } from "./recommendation-risks.js";

export interface AiBusinessRecommendationItem {
  readonly id: string;
  readonly category: AiBusinessRecommendationCategory;
  readonly priority: AiBusinessRecommendationPriority;
  readonly text: string;
}

/**
 * Frozen recommendation bundle attached to pipeline state.
 * Safe metadata only — never carries records, emails, tokens, or secrets.
 */
export interface AiBusinessRecommendation {
  readonly items: readonly AiBusinessRecommendationItem[];
  readonly priority: AiBusinessRecommendationPriority;
  readonly impact: AiBusinessRecommendationImpact;
  readonly benefits: readonly AiBusinessRecommendationBenefit[];
  readonly risks: readonly AiBusinessRecommendationRisk[];
  readonly confidence: number;
  readonly summary: string;
  readonly notes: readonly string[];
}
