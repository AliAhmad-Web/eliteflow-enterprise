/**
 * Execution rollback plan — safe reverse steps if follow-up is aborted.
 */

import { sanitizeExecutionText } from "./execution-summary.js";

export interface AiBusinessExecutionRollbackStep {
  readonly id: string;
  readonly order: number;
  readonly label: string;
}

export interface AiBusinessExecutionRollbackPlan {
  readonly steps: readonly AiBusinessExecutionRollbackStep[];
  readonly summary: string;
}

export function buildExecutionRollbackPlan(input: {
  readonly phaseCount: number;
  readonly requiresConfirmation: boolean;
}): AiBusinessExecutionRollbackPlan {
  const steps: AiBusinessExecutionRollbackStep[] = [
    {
      id: "rb.pause",
      order: 1,
      label: "Pause further tool-bound follow-up",
    },
    {
      id: "rb.revert-focus",
      order: 2,
      label: "Revert to advisory monitoring mode",
    },
  ];

  if (input.requiresConfirmation) {
    steps.push({
      id: "rb.clear-confirm",
      order: 3,
      label: "Clear pending confirmation gates",
    });
  }

  steps.push({
    id: "rb.preserve",
    order: steps.length + 1,
    label: sanitizeExecutionText(
      `Preserve ${input.phaseCount}-phase plan metadata for review`,
    ),
  });

  return Object.freeze({
    steps: Object.freeze(
      steps.map((step) =>
        Object.freeze({
          ...step,
          label: sanitizeExecutionText(step.label, 100),
        }),
      ),
    ),
    summary: "Rollback keeps planning metadata and stops tool-bound follow-up",
  });
}
