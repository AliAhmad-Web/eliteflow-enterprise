/**
 * Business risks — structured risk signals from summaries.
 */

export type AiBusinessRiskLevel = "low" | "medium" | "high";

export interface AiBusinessRisk {
  readonly level: AiBusinessRiskLevel;
  readonly text: string;
}

export function formatBusinessRiskLevel(level: AiBusinessRiskLevel): string {
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
