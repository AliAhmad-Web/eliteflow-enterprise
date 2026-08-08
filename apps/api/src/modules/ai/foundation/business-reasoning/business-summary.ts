/**
 * Business summary helpers — compact overview text.
 */

import { aiDataPolicyService } from "../policy/ai-data-policy.service.js";

export function buildBusinessSummary(input: {
  readonly moduleCount: number;
  readonly insightCount: number;
  readonly riskCount: number;
  readonly recommendationCount: number;
  readonly highlights: readonly string[];
}): string {
  if (input.moduleCount === 0) {
    return "No module summaries available for reasoning.";
  }

  const parts: string[] = [
    `Analyzed ${input.moduleCount} module summary${input.moduleCount === 1 ? "" : "ies"}`,
  ];

  if (input.insightCount > 0) {
    parts.push(`${input.insightCount} insight${input.insightCount === 1 ? "" : "s"}`);
  }
  if (input.riskCount > 0) {
    parts.push(`${input.riskCount} risk signal${input.riskCount === 1 ? "" : "s"}`);
  }
  if (input.recommendationCount > 0) {
    parts.push(
      `${input.recommendationCount} recommendation${input.recommendationCount === 1 ? "" : "s"}`,
    );
  }

  const subject = aiDataPolicyService.subjectFrom({ role: "EMPLOYEE" });
  const highlight =
    input.highlights.find((h) => h.trim().length > 0)?.trim().slice(0, 80) ??
    "";

  const base = parts.join("; ") + ".";
  const withFocus = highlight ? `${base} Focus: ${highlight}` : base;
  return aiDataPolicyService.sanitizeSummary(withFocus, subject);
}
