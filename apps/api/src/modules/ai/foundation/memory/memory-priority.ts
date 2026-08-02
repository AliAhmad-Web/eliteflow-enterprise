/**
 * Enterprise AI Memory priority levels.
 */

export type AiMemoryPriority = "low" | "medium" | "high" | "critical";

export const AI_MEMORY_PRIORITIES: readonly AiMemoryPriority[] = Object.freeze([
  "low",
  "medium",
  "high",
  "critical",
]);

const PRIORITY_WEIGHT: Readonly<Record<AiMemoryPriority, number>> = {
  low: 0.25,
  medium: 0.5,
  high: 0.75,
  critical: 1,
};

export function formatMemoryPriority(priority: AiMemoryPriority): string {
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

export function memoryPriorityWeight(priority: AiMemoryPriority): number {
  return PRIORITY_WEIGHT[priority];
}

export function resolveMemoryPriority(input: {
  readonly type: string;
  readonly recencyBoost?: boolean;
  readonly businessSignal?: boolean;
}): AiMemoryPriority {
  if (input.businessSignal && input.recencyBoost) {
    return "critical";
  }
  if (input.businessSignal || input.type === "working") {
    return "high";
  }
  if (input.recencyBoost || input.type === "conversation") {
    return "medium";
  }
  if (input.type === "preference" || input.type === "user") {
    return "medium";
  }
  return "low";
}
