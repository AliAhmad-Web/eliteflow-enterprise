/**
 * Action planning risk metadata.
 * Never executes.
 */

export type AiActionPlanRiskLevel = "low" | "medium" | "high";

export interface AiActionPlanRisk {
  readonly level: AiActionPlanRiskLevel;
  readonly text: string;
}

export function formatActionPlanRiskLevel(
  level: AiActionPlanRiskLevel,
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

function sanitize(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildActionPlanRisks(input: {
  readonly priority: "low" | "medium" | "high" | "critical";
  readonly fallback: boolean;
  readonly stepCount: number;
  readonly requiresApproval: boolean;
}): readonly AiActionPlanRisk[] {
  const risks: AiActionPlanRisk[] = [];

  if (input.fallback) {
    risks.push({
      level: "low",
      text: "Generic fallback action — limited planning specificity",
    });
  }

  if (input.priority === "critical" || input.priority === "high") {
    risks.push({
      level: "high",
      text: "Elevated priority increases sequencing and approval pressure",
    });
  } else if (input.priority === "medium") {
    risks.push({
      level: "medium",
      text: "Medium priority may require confirmation before tool stages",
    });
  }

  if (input.stepCount >= 4) {
    risks.push({
      level: "medium",
      text: "Multi-step plan increases dependency coordination risk",
    });
  }

  if (input.requiresApproval) {
    risks.push({
      level: "medium",
      text: "Human approval gate may delay downstream steps",
    });
  }

  if (risks.length === 0) {
    risks.push({
      level: "low",
      text: "No elevated action planning risks identified",
    });
  }

  return Object.freeze(
    risks.slice(0, 5).map((item) =>
      Object.freeze({
        level: item.level,
        text: sanitize(item.text),
      }),
    ),
  );
}

export function resolveOverallRiskLevel(
  risks: readonly AiActionPlanRisk[],
): AiActionPlanRiskLevel {
  if (risks.some((r) => r.level === "high")) return "high";
  if (risks.some((r) => r.level === "medium")) return "medium";
  return "low";
}
