/**
 * Business Decision risk envelope (derived from reasoning risks).
 */

export type AiBusinessDecisionRiskLevel = "low" | "medium" | "high";

export interface AiBusinessDecisionRisk {
  readonly level: AiBusinessDecisionRiskLevel;
  readonly summary: string;
}

export function formatBusinessDecisionRiskLevel(
  level: AiBusinessDecisionRiskLevel,
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

export function resolveDecisionRisk(input: {
  readonly highRiskCount: number;
  readonly mediumRiskCount: number;
  readonly lowRiskCount: number;
  readonly topRiskText?: string | null;
}): AiBusinessDecisionRisk {
  let level: AiBusinessDecisionRiskLevel;
  if (input.highRiskCount > 0) level = "high";
  else if (input.mediumRiskCount > 0) level = "medium";
  else level = "low";

  const total =
    input.highRiskCount + input.mediumRiskCount + input.lowRiskCount;
  const top = input.topRiskText?.trim();
  const summary = top
    ? top.slice(0, 120)
    : total === 0
      ? "No elevated business risks identified"
      : `${formatBusinessDecisionRiskLevel(level)} overall risk across ${total} signal${total === 1 ? "" : "s"}`;

  return Object.freeze({ level, summary });
}
