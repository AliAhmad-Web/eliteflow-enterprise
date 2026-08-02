/**
 * Business Action execution risk.
 */

export type AiBusinessActionRiskLevel = "low" | "medium" | "high";

export interface AiBusinessActionRisk {
  readonly level: AiBusinessActionRiskLevel;
  readonly summary: string;
}

export function formatBusinessActionRiskLevel(
  level: AiBusinessActionRiskLevel,
): string {
  switch (level) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function resolveBusinessActionRisk(input: {
  readonly decisionRiskLevel: "low" | "medium" | "high" | null;
  readonly requiresConfirmation: boolean;
  readonly executionMode: "advise-only" | "recommend" | "escalate" | null;
}): AiBusinessActionRisk {
  let level: AiBusinessActionRiskLevel =
    input.decisionRiskLevel ?? "low";

  if (input.executionMode === "escalate") {
    level = "high";
  } else if (input.requiresConfirmation && level === "low") {
    level = "medium";
  }

  const summary = (() => {
    switch (level) {
      case "high":
        return "High execution risk — confirmation required before tools run";
      case "medium":
        return "Moderate execution risk — review before tool execution";
      case "low":
        return "Low execution risk — advisory or light follow-up";
      default: {
        const _exhaustive: never = level;
        return _exhaustive;
      }
    }
  })();

  return Object.freeze({ level, summary });
}
