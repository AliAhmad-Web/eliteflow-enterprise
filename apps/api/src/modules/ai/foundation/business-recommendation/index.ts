/**
 * Enterprise Business Recommendation Engine public exports.
 */

export type {
  AiBusinessRecommendation,
  AiBusinessRecommendationItem,
} from "./business-recommendation.js";

export type { AiBusinessRecommendationCategory } from "./recommendation-categories.js";
export {
  formatRecommendationCategory,
  sanitizeRecommendationText,
} from "./recommendation-categories.js";

export type { AiBusinessRecommendationPriority } from "./recommendation-priority.js";
export {
  formatRecommendationPriority,
  resolveRecommendationPriority,
} from "./recommendation-priority.js";

export type {
  AiBusinessRecommendationImpact,
  AiBusinessRecommendationImpactLevel,
} from "./recommendation-impact.js";
export {
  formatRecommendationImpactLevel,
  resolveRecommendationImpact,
} from "./recommendation-impact.js";

export type { AiBusinessRecommendationBenefit } from "./recommendation-benefits.js";
export { buildRecommendationBenefits } from "./recommendation-benefits.js";

export type {
  AiBusinessRecommendationRisk,
  AiBusinessRecommendationRiskLevel,
} from "./recommendation-risks.js";
export {
  formatRecommendationRiskLevel,
  buildRecommendationRisks,
} from "./recommendation-risks.js";

export {
  clampRecommendationConfidence,
  scoreRecommendationConfidence,
} from "./recommendation-confidence.js";

export { buildRecommendationSummary } from "./recommendation-summary.js";

export type { ResolveBusinessRecommendationInput } from "./business-recommendation-engine.js";
export {
  resolveBusinessRecommendation,
  businessRecommendationEngine,
} from "./business-recommendation-engine.js";

export { formatBusinessRecommendationForRuntime } from "./business-recommendation-runtime.js";
