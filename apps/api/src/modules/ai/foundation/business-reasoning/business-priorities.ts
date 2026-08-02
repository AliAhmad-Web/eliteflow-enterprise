/**
 * Business priorities — ordered focus areas derived from summaries.
 */

export type AiBusinessPriorityUrgency = "low" | "medium" | "high";

export interface AiBusinessPriority {
  readonly urgency: AiBusinessPriorityUrgency;
  readonly text: string;
}

export function formatBusinessPriorityUrgency(
  urgency: AiBusinessPriorityUrgency,
): string {
  switch (urgency) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    default: {
      const _exhaustive: never = urgency;
      return _exhaustive;
    }
  }
}
