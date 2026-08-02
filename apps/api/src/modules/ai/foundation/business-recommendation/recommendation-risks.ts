/**
 * Recommendation risks — caution signals tied to recommendations.
 */

export type AiBusinessRecommendationRiskLevel = "low" | "medium" | "high";

export interface AiBusinessRecommendationRisk {
  readonly level: AiBusinessRecommendationRiskLevel;
  readonly text: string;
}

export function formatRecommendationRiskLevel(
  level: AiBusinessRecommendationRiskLevel,
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

export function buildRecommendationRisks(input: {
  readonly criticalAlertTexts: readonly string[];
  readonly warningAlertTexts: readonly string[];
  readonly forecastOutlook: string | null;
}): readonly AiBusinessRecommendationRisk[] {
  const risks: AiBusinessRecommendationRisk[] = [];

  for (const text of input.criticalAlertTexts.slice(0, 3)) {
    risks.push({
      level: "high",
      text: text.slice(0, 120),
    });
  }
  for (const text of input.warningAlertTexts.slice(0, 2)) {
    risks.push({
      level: "medium",
      text: text.slice(0, 120),
    });
  }
  if (input.forecastOutlook === "negative") {
    risks.push({
      level: "high",
      text: "Negative near-term forecast increases execution urgency",
    });
  } else if (input.forecastOutlook === "cautious") {
    risks.push({
      level: "medium",
      text: "Cautious forecast — validate before large commitments",
    });
  }
  if (risks.length === 0) {
    risks.push({
      level: "low",
      text: "No elevated recommendation risks from current intelligence",
    });
  }

  return Object.freeze(risks.slice(0, 5).map((item) => Object.freeze(item)));
}
