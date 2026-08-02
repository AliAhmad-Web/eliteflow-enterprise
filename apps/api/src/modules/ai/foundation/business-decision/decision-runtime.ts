/**
 * Format Business Decision as safe Runtime Instructions metadata.
 * Never exposes internal objects, records, or secrets.
 */

import type { AiBusinessDecision } from "./business-decision.js";
import { formatBusinessDecisionPriority } from "./decision-priority.js";
import { formatBusinessDecisionImpactLevel } from "./decision-impact.js";
import { formatBusinessDecisionRiskLevel } from "./decision-risk.js";
import { formatBusinessDecisionRecommendationAction } from "./decision-recommendation.js";
import { formatBusinessDecisionOptionKind } from "./decision-options.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only business decision metadata for the Runtime section.
 */
export function formatBusinessDecisionForRuntime(
  decision: AiBusinessDecision | null | undefined,
): string {
  if (!decision) return "";

  const lines: string[] = [
    "Business Decision:",
    `Priority: ${formatBusinessDecisionPriority(decision.priority)}`,
    `Business Impact: ${formatBusinessDecisionImpactLevel(decision.impact.level)}`,
    `Business Risk: ${formatBusinessDecisionRiskLevel(decision.risk.level)}`,
    `Recommendation: ${formatBusinessDecisionRecommendationAction(decision.recommendation.action)} — ${sanitizeLine(decision.recommendation.text, 120)}`,
    `Confidence: ${decision.confidence.toFixed(2)}`,
  ];

  if (decision.reasoningSummary.trim()) {
    lines.push(
      `Reasoning Summary: ${sanitizeLine(decision.reasoningSummary, 160)}`,
    );
  }

  if (decision.options.length > 0) {
    lines.push("Decision Options:");
    for (const option of decision.options.slice(0, 4)) {
      lines.push(
        `- [${formatBusinessDecisionOptionKind(option.kind)}] ${sanitizeLine(option.label, 80)}`,
      );
    }
  }

  return lines.join("\n").trim();
}
