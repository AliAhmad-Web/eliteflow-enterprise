/**
 * Action priority levels for planning metadata.
 * Never executes.
 */

export type AiActionPlanPriority = "low" | "medium" | "high" | "critical";

export function formatActionPlanPriority(
  priority: AiActionPlanPriority,
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

export function resolveActionPlanPriority(input: {
  readonly fallback: boolean;
  readonly confidence: number;
  readonly category?: string | null;
}): AiActionPlanPriority {
  if (input.fallback) return "low";
  if (input.confidence >= 0.85) return "high";
  if (input.confidence >= 0.65) return "medium";
  if (
    input.category === "workflow" ||
    input.category === "email" ||
    input.category === "crm"
  ) {
    return "medium";
  }
  return "low";
}
