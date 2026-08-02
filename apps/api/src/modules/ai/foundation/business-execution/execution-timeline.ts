/**
 * Execution timeline — relative planning windows.
 */

export type AiBusinessExecutionHorizon =
  | "immediate"
  | "short-term"
  | "medium-term";

export interface AiBusinessExecutionTimeline {
  readonly horizon: AiBusinessExecutionHorizon;
  readonly phaseCount: number;
  readonly milestoneCount: number;
  readonly summary: string;
}

export function formatExecutionHorizon(
  horizon: AiBusinessExecutionHorizon,
): string {
  switch (horizon) {
    case "immediate":
      return "Immediate";
    case "short-term":
      return "Short Term";
    case "medium-term":
      return "Medium Term";
    default: {
      const _exhaustive: never = horizon;
      return _exhaustive;
    }
  }
}

export function buildExecutionTimeline(input: {
  readonly priority: "low" | "medium" | "high" | "critical";
  readonly phaseCount: number;
  readonly milestoneCount: number;
}): AiBusinessExecutionTimeline {
  let horizon: AiBusinessExecutionHorizon;
  switch (input.priority) {
    case "critical":
      horizon = "immediate";
      break;
    case "high":
      horizon = "short-term";
      break;
    case "medium":
    case "low":
      horizon = "medium-term";
      break;
    default: {
      const _exhaustive: never = input.priority;
      return _exhaustive;
    }
  }

  return Object.freeze({
    horizon,
    phaseCount: input.phaseCount,
    milestoneCount: input.milestoneCount,
    summary: `${formatExecutionHorizon(horizon)} plan with ${input.phaseCount} phases and ${input.milestoneCount} milestones`,
  });
}
