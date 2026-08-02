/**
 * Execution risks — planning risks (not runtime tool execution).
 */

import { sanitizeExecutionText } from "./execution-summary.js";

export type AiBusinessExecutionRiskLevel = "low" | "medium" | "high";

export interface AiBusinessExecutionRisk {
  readonly level: AiBusinessExecutionRiskLevel;
  readonly text: string;
}

export function formatExecutionRiskLevel(
  level: AiBusinessExecutionRiskLevel,
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

export function buildExecutionRisks(input: {
  readonly recommendationRiskTexts: readonly string[];
  readonly priority: "low" | "medium" | "high" | "critical";
}): readonly AiBusinessExecutionRisk[] {
  const risks: AiBusinessExecutionRisk[] = [];

  for (const text of input.recommendationRiskTexts.slice(0, 3)) {
    risks.push({
      level: "high",
      text: sanitizeExecutionText(text, 120),
    });
  }

  if (input.priority === "critical") {
    risks.push({
      level: "high",
      text: "Critical priority increases execution sequencing pressure",
    });
  } else if (input.priority === "high") {
    risks.push({
      level: "medium",
      text: "High priority requires confirmation before tool stages",
    });
  }

  if (risks.length === 0) {
    risks.push({
      level: "low",
      text: "No elevated execution planning risks identified",
    });
  }

  return Object.freeze(risks.slice(0, 5).map((item) => Object.freeze(item)));
}
