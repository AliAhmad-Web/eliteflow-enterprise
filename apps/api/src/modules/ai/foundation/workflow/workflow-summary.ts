/**
 * Workflow summary — SAFE text for PE.
 */

import type { AiWorkflowKind } from "./workflow-definition.js";
import { formatWorkflowKind } from "./workflow-definition.js";
import { sanitizeWorkflowText } from "./workflow-definition.js";

export function buildWorkflowSummary(input: {
  readonly kind: AiWorkflowKind;
  readonly stepCount: number;
  readonly transitionCount: number;
  readonly waitingCount: number;
  readonly actionName?: string | null;
}): string {
  const actionPart = input.actionName
    ? ` for ${sanitizeWorkflowText(input.actionName, 40)}`
    : "";
  return sanitizeWorkflowText(
    `${formatWorkflowKind(input.kind)} workflow plan${actionPart}: ${input.stepCount} steps, ${input.transitionCount} transitions, ${input.waitingCount} waiting — no execution`,
    220,
  );
}
