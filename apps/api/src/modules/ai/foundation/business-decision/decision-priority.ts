/**
 * Business Decision priority levels.
 */

export type AiBusinessDecisionPriority = "low" | "medium" | "high" | "critical";

export function formatBusinessDecisionPriority(
  priority: AiBusinessDecisionPriority,
): string {
  switch (priority) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    case "critical":
      return "Critical";
    default: {
      const _exhaustive: never = priority;
      return _exhaustive;
    }
  }
}

export function resolveDecisionPriority(input: {
  readonly highRiskCount: number;
  readonly mediumRiskCount: number;
  readonly highRecommendationCount: number;
  readonly highUrgencyCount: number;
}): AiBusinessDecisionPriority {
  if (input.highRiskCount >= 2 || input.highUrgencyCount >= 2) {
    return "critical";
  }
  if (
    input.highRiskCount >= 1 ||
    input.highRecommendationCount >= 2 ||
    input.highUrgencyCount >= 1
  ) {
    return "high";
  }
  if (input.mediumRiskCount >= 1 || input.highRecommendationCount >= 1) {
    return "medium";
  }
  return "low";
}
