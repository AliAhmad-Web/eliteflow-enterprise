/**
 * Action estimation — cost and duration planning metadata.
 * Never executes.
 */

export type AiActionCostBand = "none" | "low" | "medium" | "high";
export type AiActionDurationBand =
  | "immediate"
  | "short"
  | "medium"
  | "extended";

export interface AiActionEstimation {
  readonly estimatedCost: AiActionCostBand;
  readonly estimatedDuration: AiActionDurationBand;
  readonly stepCount: number;
  readonly summary: string;
}

export function formatActionCostBand(band: AiActionCostBand): string {
  switch (band) {
    case "none":
      return "None";
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    default: {
      const _exhaustive: never = band;
      return _exhaustive;
    }
  }
}

export function formatActionDurationBand(
  band: AiActionDurationBand,
): string {
  switch (band) {
    case "immediate":
      return "Immediate";
    case "short":
      return "Short";
    case "medium":
      return "Medium";
    case "extended":
      return "Extended";
    default: {
      const _exhaustive: never = band;
      return _exhaustive;
    }
  }
}

function sanitize(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildActionEstimation(input: {
  readonly stepCount: number;
  readonly requiresApproval: boolean;
  readonly fallback: boolean;
  readonly priority: "low" | "medium" | "high" | "critical";
}): AiActionEstimation {
  let estimatedCost: AiActionCostBand = "none";
  if (input.stepCount >= 5) estimatedCost = "medium";
  else if (input.stepCount >= 3) estimatedCost = "low";

  let estimatedDuration: AiActionDurationBand = "short";
  if (input.fallback) estimatedDuration = "immediate";
  else if (input.requiresApproval) estimatedDuration = "extended";
  else if (input.stepCount >= 5 || input.priority === "critical") {
    estimatedDuration = "medium";
  }

  return Object.freeze({
    estimatedCost,
    estimatedDuration,
    stepCount: input.stepCount,
    summary: sanitize(
      `Planning estimate: cost ${estimatedCost}, duration ${estimatedDuration}, steps ${input.stepCount}`,
    ),
  });
}
