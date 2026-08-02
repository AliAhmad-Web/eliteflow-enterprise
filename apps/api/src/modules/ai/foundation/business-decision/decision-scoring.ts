/**
 * Business Decision scoring — rank options from reasoning signals.
 */

import type { AiBusinessDecisionOption } from "./decision-options.js";
import { sanitizeDecisionText } from "./decision-options.js";
import type { AiBusinessReasoning } from "../business-reasoning/business-reasoning.js";

export function scoreDecisionOptions(
  reasoning: AiBusinessReasoning | null | undefined,
): readonly AiBusinessDecisionOption[] {
  if (!reasoning) {
    return Object.freeze([
      Object.freeze({
        id: "opt.monitor",
        kind: "monitor" as const,
        label: "Monitor current status",
        score: 0.4,
      }),
    ]);
  }

  const options: AiBusinessDecisionOption[] = [];

  const highRisks = reasoning.risks.filter((r) => r.level === "high");
  const mediumRisks = reasoning.risks.filter((r) => r.level === "medium");
  const highRecs = reasoning.recommendations.filter(
    (r) => r.priority === "high",
  );
  const highPriorities = reasoning.priorities.filter(
    (p) => p.urgency === "high",
  );

  if (highRisks.length > 0 || highPriorities.length > 0) {
    options.push({
      id: "opt.prioritize",
      kind: "prioritize",
      label: sanitizeDecisionText(
        highRecs[0]?.text ||
          highPriorities[0]?.text ||
          "Prioritize elevated risk items",
        80,
      ),
      score: 0.9 + Math.min(0.08, highRisks.length * 0.02),
    });
  }

  if (
    reasoning.recommendations.some((r) =>
      r.text.toLowerCase().includes("review"),
    ) ||
    reasoning.insights.some((i) => i.kind === "attention")
  ) {
    options.push({
      id: "opt.review",
      kind: "review",
      label: sanitizeDecisionText(
        reasoning.recommendations.find((r) =>
          r.text.toLowerCase().includes("review"),
        )?.text || "Review outstanding items",
        80,
      ),
      score: 0.75,
    });
  }

  if (mediumRisks.length > 0 || reasoning.insights.length > 0) {
    options.push({
      id: "opt.respond",
      kind: "respond",
      label: "Respond to business signals",
      score: 0.65,
    });
  }

  options.push({
    id: "opt.monitor",
    kind: "monitor",
    label: "Monitor and continue",
    score: highRisks.length > 0 ? 0.35 : 0.55,
  });

  if (highRisks.length === 0 && mediumRisks.length === 0) {
    options.push({
      id: "opt.defer",
      kind: "defer",
      label: "No urgent decision needed",
      score: 0.5,
    });
  }

  const sorted = [...options].sort((a, b) => b.score - a.score);
  return Object.freeze(
    sorted.slice(0, 5).map((opt) =>
      Object.freeze({
        ...opt,
        score: Math.min(1, Math.round(opt.score * 100) / 100),
      }),
    ),
  );
}
