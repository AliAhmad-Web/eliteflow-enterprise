/**
 * Long-term memory priority levels.
 */

export type AiLongTermMemoryPriority =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "archive";

export function formatLongTermMemoryPriority(
  priority: AiLongTermMemoryPriority,
): string {
  switch (priority) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    case "archive":
      return "Archive";
    default: {
      const _exhaustive: never = priority;
      return _exhaustive;
    }
  }
}

export function resolveLongTermMemoryPriority(input: {
  readonly importance: number;
  readonly strength: number;
  readonly category: string;
}): AiLongTermMemoryPriority {
  if (input.category === "preference" || input.importance >= 0.85) {
    return "critical";
  }
  if (input.importance >= 0.7 || input.strength >= 0.75) return "high";
  if (input.importance >= 0.45 || input.strength >= 0.45) return "medium";
  if (input.importance >= 0.25) return "low";
  return "archive";
}
