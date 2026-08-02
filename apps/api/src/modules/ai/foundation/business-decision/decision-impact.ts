/**
 * Business Decision impact assessment.
 */

export type AiBusinessDecisionImpactLevel =
  | "minimal"
  | "moderate"
  | "significant"
  | "major";

export interface AiBusinessDecisionImpact {
  readonly level: AiBusinessDecisionImpactLevel;
  readonly summary: string;
}

export function formatBusinessDecisionImpactLevel(
  level: AiBusinessDecisionImpactLevel,
): string {
  switch (level) {
    case "minimal":
      return "Minimal";
    case "moderate":
      return "Moderate";
    case "significant":
      return "Significant";
    case "major":
      return "Major";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function resolveDecisionImpact(input: {
  readonly priority: "low" | "medium" | "high" | "critical";
  readonly insightCount: number;
  readonly riskCount: number;
}): AiBusinessDecisionImpact {
  let level: AiBusinessDecisionImpactLevel;
  switch (input.priority) {
    case "critical":
      level = "major";
      break;
    case "high":
      level = "significant";
      break;
    case "medium":
      level = "moderate";
      break;
    case "low":
      level = "minimal";
      break;
    default: {
      const _exhaustive: never = input.priority;
      return _exhaustive;
    }
  }

  const summary =
    input.riskCount > 0
      ? `${formatBusinessDecisionImpactLevel(level)} impact with ${input.riskCount} risk signal${input.riskCount === 1 ? "" : "s"}`
      : input.insightCount > 0
        ? `${formatBusinessDecisionImpactLevel(level)} impact from ${input.insightCount} insight${input.insightCount === 1 ? "" : "s"}`
        : `${formatBusinessDecisionImpactLevel(level)} business impact`;

  return Object.freeze({ level, summary });
}
