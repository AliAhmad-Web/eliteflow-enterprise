/**
 * Business Action priority levels.
 */

export type AiBusinessActionPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export function formatBusinessActionPriority(
  priority: AiBusinessActionPriority,
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

export function resolveBusinessActionPriority(input: {
  readonly decisionPriority: "low" | "medium" | "high" | "critical" | null;
  readonly actionable: boolean;
}): AiBusinessActionPriority {
  if (!input.decisionPriority) return "low";
  if (!input.actionable && input.decisionPriority === "low") return "low";
  switch (input.decisionPriority) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    default: {
      const _exhaustive: never = input.decisionPriority;
      return _exhaustive;
    }
  }
}
