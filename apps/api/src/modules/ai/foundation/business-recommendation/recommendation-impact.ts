/**
 * Recommendation impact assessment.
 */

export type AiBusinessRecommendationImpactLevel =
  | "minimal"
  | "moderate"
  | "significant"
  | "major";

export interface AiBusinessRecommendationImpact {
  readonly level: AiBusinessRecommendationImpactLevel;
  readonly summary: string;
}

export function formatRecommendationImpactLevel(
  level: AiBusinessRecommendationImpactLevel,
): string {
  switch (level) {
    case "minimal":
      return "Minimal";
    case "moderate":
      return "Moderate";
    case "significant":
      return "Significant";
    case "major":
      return "Major";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function resolveRecommendationImpact(input: {
  readonly priority: AiBusinessRecommendationPriorityLike;
  readonly opportunityCount: number;
  readonly alertCount: number;
}): AiBusinessRecommendationImpact {
  let level: AiBusinessRecommendationImpactLevel;
  switch (input.priority) {
    case "critical":
      level = "major";
      break;
    case "high":
      level = "significant";
      break;
    case "medium":
      level = "moderate";
      break;
    case "low":
      level = "minimal";
      break;
    default: {
      const _exhaustive: never = input.priority;
      return _exhaustive;
    }
  }

  return Object.freeze({
    level,
    summary: `${formatRecommendationImpactLevel(level)} expected impact across ${input.opportunityCount} opportunit${input.opportunityCount === 1 ? "y" : "ies"} and ${input.alertCount} alert${input.alertCount === 1 ? "" : "s"}`,
  });
}

type AiBusinessRecommendationPriorityLike =
  | "low"
  | "medium"
  | "high"
  | "critical";
