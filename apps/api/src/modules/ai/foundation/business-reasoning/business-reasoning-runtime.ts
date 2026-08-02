/**
 * Format Business Reasoning as safe Runtime Instructions metadata.
 * Never exposes private records or raw module data dumps.
 */

import type { AiBusinessReasoning } from "./business-reasoning.js";
import { formatBusinessRiskLevel } from "./business-risks.js";
import { formatBusinessRecommendationPriority } from "./business-recommendations.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only business reasoning metadata for the Runtime section.
 */
export function formatBusinessReasoningForRuntime(
  reasoning: AiBusinessReasoning | null | undefined,
): string {
  if (!reasoning) return "";

  const lines: string[] = ["Business Reasoning:"];

  if (reasoning.summary.trim()) {
    lines.push(`Business Summary: ${sanitizeLine(reasoning.summary, 200)}`);
  }

  if (reasoning.insights.length > 0) {
    lines.push("Insights:");
    for (const insight of reasoning.insights.slice(0, 5)) {
      lines.push(`- ${sanitizeLine(insight.text, 120)}`);
    }
  }

  if (reasoning.risks.length > 0) {
    lines.push("Risks:");
    for (const risk of reasoning.risks.slice(0, 4)) {
      lines.push(
        `- [${formatBusinessRiskLevel(risk.level)}] ${sanitizeLine(risk.text, 120)}`,
      );
    }
  }

  if (reasoning.recommendations.length > 0) {
    lines.push("Recommendations:");
    for (const rec of reasoning.recommendations.slice(0, 4)) {
      lines.push(
        `- [${formatBusinessRecommendationPriority(rec.priority)}] ${sanitizeLine(rec.text, 120)}`,
      );
    }
  }

  lines.push(`Confidence: ${reasoning.confidence.toFixed(2)}`);

  return lines.join("\n").trim();
}
