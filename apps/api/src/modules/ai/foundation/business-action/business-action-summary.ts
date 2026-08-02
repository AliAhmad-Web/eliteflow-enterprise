/**
 * Business Action summary helpers.
 */

import type { AiBusinessActionPriority } from "./business-action-priority.js";
import { formatBusinessActionPriority } from "./business-action-priority.js";
import type { AiBusinessActionRiskLevel } from "./business-action-risk.js";
import { formatBusinessActionRiskLevel } from "./business-action-risk.js";

export function buildBusinessActionSummary(input: {
  readonly stepCount: number;
  readonly priority: AiBusinessActionPriority;
  readonly riskLevel: AiBusinessActionRiskLevel;
  readonly executable: boolean;
  readonly recommendationText?: string | null;
}): string {
  const focus = input.recommendationText?.trim().slice(0, 80) ?? "";
  const base = [
    `${input.stepCount} planned step${input.stepCount === 1 ? "" : "s"}`,
    `priority ${formatBusinessActionPriority(input.priority)}`,
    `risk ${formatBusinessActionRiskLevel(input.riskLevel)}`,
    input.executable ? "executable via tools" : "advisory only",
  ].join("; ");

  return focus ? `${base}. Focus: ${focus}` : `${base}.`;
}
