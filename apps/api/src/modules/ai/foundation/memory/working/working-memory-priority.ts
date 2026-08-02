/**
 * Working memory priority for eviction / capacity management.
 */

export type AiWorkingMemoryPriority =
  | "critical"
  | "high"
  | "medium"
  | "low";

export function formatWorkingMemoryPriority(
  priority: AiWorkingMemoryPriority,
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
    default: {
      const _exhaustive: never = priority;
      return _exhaustive;
    }
  }
}

const PRIORITY_WEIGHT: Readonly<Record<AiWorkingMemoryPriority, number>> = {
  critical: 1,
  high: 0.75,
  medium: 0.5,
  low: 0.25,
};

export function workingMemoryPriorityWeight(
  priority: AiWorkingMemoryPriority,
): number {
  return PRIORITY_WEIGHT[priority];
}

export function resolveWorkingMemoryPriority(input: {
  readonly kind: string;
  readonly recency: number;
  readonly objectiveMatch?: boolean;
}): AiWorkingMemoryPriority {
  if (input.kind === "objective" || input.objectiveMatch) return "critical";
  if (input.kind === "task" || input.kind === "focus") return "high";
  if (input.recency >= 0.7) return "medium";
  return "low";
}
