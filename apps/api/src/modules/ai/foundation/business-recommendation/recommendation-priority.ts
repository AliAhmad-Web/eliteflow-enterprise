/**
 * Recommendation priority levels.
 */

export type AiBusinessRecommendationPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export function formatRecommendationPriority(
  priority: AiBusinessRecommendationPriority,
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

export function resolveRecommendationPriority(input: {
  readonly healthLevel: "healthy" | "fair" | "at-risk" | "critical" | null;
  readonly hasCriticalAlert: boolean;
  readonly forecastOutlook: "positive" | "neutral" | "cautious" | "negative" | null;
}): AiBusinessRecommendationPriority {
  if (input.hasCriticalAlert || input.healthLevel === "critical") {
    return "critical";
  }
  if (
    input.healthLevel === "at-risk" ||
    input.forecastOutlook === "negative"
  ) {
    return "high";
  }
  if (
    input.healthLevel === "fair" ||
    input.forecastOutlook === "cautious"
  ) {
    return "medium";
  }
  return "low";
}
