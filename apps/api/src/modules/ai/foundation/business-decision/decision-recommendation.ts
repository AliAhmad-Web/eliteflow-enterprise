/**
 * Business Decision recommendation — primary selected action.
 */

export type AiBusinessDecisionRecommendationAction =
  | "prioritize_work"
  | "review_items"
  | "monitor_status"
  | "respond_now"
  | "no_action";

export interface AiBusinessDecisionRecommendation {
  readonly action: AiBusinessDecisionRecommendationAction;
  readonly text: string;
}

export function formatBusinessDecisionRecommendationAction(
  action: AiBusinessDecisionRecommendationAction,
): string {
  switch (action) {
    case "prioritize_work":
      return "Prioritize Work";
    case "review_items":
      return "Review Items";
    case "monitor_status":
      return "Monitor Status";
    case "respond_now":
      return "Respond Now";
    case "no_action":
      return "No Action";
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function resolveDecisionRecommendation(input: {
  readonly priority: "low" | "medium" | "high" | "critical";
  readonly riskLevel: "low" | "medium" | "high";
  readonly topRecommendationText?: string | null;
  readonly topPriorityText?: string | null;
}): AiBusinessDecisionRecommendation {
  let action: AiBusinessDecisionRecommendationAction;
  switch (input.priority) {
    case "critical":
      action = "respond_now";
      break;
    case "high":
      action =
        input.riskLevel === "high" ? "prioritize_work" : "review_items";
      break;
    case "medium":
      action = "review_items";
      break;
    case "low":
      action =
        input.riskLevel === "low" ? "no_action" : "monitor_status";
      break;
    default: {
      const _exhaustive: never = input.priority;
      return _exhaustive;
    }
  }

  const preferred =
    input.topRecommendationText?.trim() ||
    input.topPriorityText?.trim() ||
    "";

  const fallback = (() => {
    switch (action) {
      case "respond_now":
        return "Take immediate action on critical business signals";
      case "prioritize_work":
        return "Prioritize high-risk and overdue work items";
      case "review_items":
        return "Review outstanding items and adjust focus";
      case "monitor_status":
        return "Continue monitoring current business status";
      case "no_action":
        return "No urgent business decision required";
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  })();

  return Object.freeze({
    action,
    text: (preferred || fallback).slice(0, 160),
  });
}
