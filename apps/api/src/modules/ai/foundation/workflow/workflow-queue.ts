/**
 * Workflow queue — planning queue snapshot only.
 * Never dispatches work.
 */

import type { AiWorkflowStep } from "./workflow-step.js";

export interface AiWorkflowQueueItem {
  readonly stepId: string;
  readonly position: number;
  readonly status: "queued" | "waiting" | "held";
}

export interface AiWorkflowQueue {
  readonly items: readonly AiWorkflowQueueItem[];
  readonly depth: number;
}

export function buildWorkflowQueue(
  steps: readonly AiWorkflowStep[],
): AiWorkflowQueue {
  const actionable = steps.filter(
    (s) =>
      s.kind === "action" ||
      s.kind === "parallel" ||
      s.kind === "approval" ||
      s.kind === "wait",
  );

  const items = Object.freeze(
    actionable.slice(0, 8).map((step, index) =>
      Object.freeze({
        stepId: step.id,
        position: index + 1,
        status: step.waiting
          ? ("waiting" as const)
          : step.status === "blocked"
            ? ("held" as const)
            : ("queued" as const),
      }),
    ),
  );

  return Object.freeze({
    items,
    depth: items.length,
  });
}
