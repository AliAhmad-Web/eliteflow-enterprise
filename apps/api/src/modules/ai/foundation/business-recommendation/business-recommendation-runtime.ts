/**
 * Format Business Recommendation as safe Runtime Instructions metadata.
 * Never exposes internal objects, records, or secrets.
 */

import type { AiBusinessRecommendation } from "./business-recommendation.js";
import { formatRecommendationPriority } from "./recommendation-priority.js";
import { formatRecommendationImpactLevel } from "./recommendation-impact.js";
import { formatRecommendationCategory } from "./recommendation-categories.js";
import { formatRecommendationRiskLevel } from "./recommendation-risks.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only business recommendation metadata for the Runtime section.
 */
export function formatBusinessRecommendationForRuntime(
  recommendation: AiBusinessRecommendation | null | undefined,
): string {
  if (!recommendation) return "";

  const lines: string[] = [
    "Business Recommendations:",
    `Summary: ${sanitizeLine(recommendation.summary, 200)}`,
    `Priority: ${formatRecommendationPriority(recommendation.priority)}`,
    `Impact: ${formatRecommendationImpactLevel(recommendation.impact.level)}`,
    `Confidence: ${recommendation.confidence.toFixed(2)}`,
  ];

  if (recommendation.items.length > 0) {
    lines.push("Top Recommendations:");
    for (const item of recommendation.items.slice(0, 5)) {
      lines.push(
        `- [${formatRecommendationCategory(item.category)}] ${sanitizeLine(item.text, 100)}`,
      );
    }
  }

  const elevatedRisks = recommendation.risks.filter((r) => r.level !== "low");
  if (elevatedRisks.length > 0) {
    lines.push("Recommendation Risks:");
    for (const risk of elevatedRisks.slice(0, 3)) {
      lines.push(
        `- [${formatRecommendationRiskLevel(risk.level)}] ${sanitizeLine(risk.text, 100)}`,
      );
    }
  }

  return lines.join("\n").trim();
}
