/**
 * Workflow transitions — planning edges only.
 * Never executes.
 */

import type { AiWorkflowStep } from "./workflow-step.js";

export interface AiWorkflowTransition {
  readonly id: string;
  readonly fromStepId: string;
  readonly toStepId: string;
  readonly label: string;
  readonly conditional: boolean;
}

function sanitize(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildWorkflowTransitions(
  steps: readonly AiWorkflowStep[],
): readonly AiWorkflowTransition[] {
  const ordered = [...steps].sort((a, b) => a.order - b.order);
  const transitions: AiWorkflowTransition[] = [];

  for (let i = 0; i < ordered.length - 1; i += 1) {
    const from = ordered[i];
    const to = ordered[i + 1];
    if (!from || !to) continue;
    transitions.push(
      Object.freeze({
        id: `tr.${from.id}.${to.id}`,
        fromStepId: from.id,
        toStepId: to.id,
        label: sanitize(`${from.name} → ${to.name}`),
        conditional: from.kind === "branch" || to.kind === "branch",
      }),
    );
  }

  return Object.freeze(transitions.slice(0, 16));
}
