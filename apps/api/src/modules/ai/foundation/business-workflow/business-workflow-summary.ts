/**
 * Business Workflow summary helpers.
 */

import type { AiBusinessWorkflowKind } from "./business-workflow-definition.js";
import { formatBusinessWorkflowKind } from "./business-workflow-definition.js";

export function buildBusinessWorkflowSummary(input: {
  readonly kind: AiBusinessWorkflowKind;
  readonly stepCount: number;
  readonly transitionCount: number;
  readonly executable: boolean;
  readonly actionSummary?: string | null;
}): string {
  const parts = [
    formatBusinessWorkflowKind(input.kind),
    `${input.stepCount} step${input.stepCount === 1 ? "" : "s"}`,
    `${input.transitionCount} transition${input.transitionCount === 1 ? "" : "s"}`,
    input.executable ? "tool-bound" : "advisory",
  ];
  const focus = input.actionSummary?.trim().slice(0, 80) ?? "";
  const base = parts.join("; ") + ".";
  return focus ? `${base} Focus: ${focus}` : base;
}
