/**
 * Recommendation categories for Business Recommendation Engine.
 */

export type AiBusinessRecommendationCategory =
  | "executive"
  | "operational"
  | "strategic"
  | "risk"
  | "productivity"
  | "cost_optimization"
  | "resource_optimization"
  | "opportunity";

export function formatRecommendationCategory(
  category: AiBusinessRecommendationCategory,
): string {
  switch (category) {
    case "executive":
      return "Executive";
    case "operational":
      return "Operational";
    case "strategic":
      return "Strategic";
    case "risk":
      return "Risk";
    case "productivity":
      return "Productivity";
    case "cost_optimization":
      return "Cost Optimization";
    case "resource_optimization":
      return "Resource Optimization";
    case "opportunity":
      return "Opportunity";
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

export function sanitizeRecommendationText(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}
