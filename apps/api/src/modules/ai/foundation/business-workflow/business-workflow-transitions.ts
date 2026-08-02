/**
 * Business Workflow transitions — ordered edges between steps.
 */

import type { AiBusinessWorkflowStep } from "./business-workflow-steps.js";

export type AiBusinessWorkflowTransitionKind =
  | "next"
  | "confirm"
  | "skip"
  | "complete";

export interface AiBusinessWorkflowTransition {
  readonly id: string;
  readonly fromStepId: string;
  readonly toStepId: string;
  readonly kind: AiBusinessWorkflowTransitionKind;
}

export function formatBusinessWorkflowTransitionKind(
  kind: AiBusinessWorkflowTransitionKind,
): string {
  switch (kind) {
    case "next":
      return "Next";
    case "confirm":
      return "Confirm";
    case "skip":
      return "Skip";
    case "complete":
      return "Complete";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function buildWorkflowTransitions(input: {
  readonly steps: readonly AiBusinessWorkflowStep[];
  readonly requiresConfirmation: boolean;
}): readonly AiBusinessWorkflowTransition[] {
  const steps = input.steps;
  if (steps.length === 0) return Object.freeze([]);

  const transitions: AiBusinessWorkflowTransition[] = [];

  for (let i = 0; i < steps.length - 1; i += 1) {
    const from = steps[i]!;
    const to = steps[i + 1]!;
    const kind =
      input.requiresConfirmation && i === 0
        ? ("confirm" as const)
        : from.status === "skipped"
          ? ("skip" as const)
          : ("next" as const);

    transitions.push(
      Object.freeze({
        id: `wf.tx.${from.id}.${to.id}`,
        fromStepId: from.id,
        toStepId: to.id,
        kind,
      }),
    );
  }

  const last = steps[steps.length - 1]!;
  transitions.push(
    Object.freeze({
      id: `wf.tx.${last.id}.complete`,
      fromStepId: last.id,
      toStepId: "wf.end",
      kind: "complete" as const,
    }),
  );

  return Object.freeze(transitions);
}
