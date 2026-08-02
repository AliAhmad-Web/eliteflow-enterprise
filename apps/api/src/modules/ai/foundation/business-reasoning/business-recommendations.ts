/**
 * Business recommendations — actionable suggestions from summaries.
 */

export type AiBusinessRecommendationPriority = "low" | "medium" | "high";

export interface AiBusinessRecommendation {
  readonly priority: AiBusinessRecommendationPriority;
  readonly text: string;
}

export function formatBusinessRecommendationPriority(
  priority: AiBusinessRecommendationPriority,
): string {
  switch (priority) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    default: {
      const _exhaustive: never = priority;
      return _exhaustive;
    }
  }
}
