/**
 * Business Workflow steps — ordered executable nodes (never executed here).
 */

import type { AiBusinessActionStep } from "../business-action/business-action-plan.js";
import { sanitizeWorkflowText } from "./business-workflow-definition.js";

export type AiBusinessWorkflowStepStatus =
  | "pending"
  | "ready"
  | "blocked"
  | "skipped";

export interface AiBusinessWorkflowStep {
  readonly id: string;
  readonly label: string;
  readonly order: number;
  readonly status: AiBusinessWorkflowStepStatus;
  readonly sourceActionStepId: string | null;
}

export function formatBusinessWorkflowStepStatus(
  status: AiBusinessWorkflowStepStatus,
): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "ready":
      return "Ready";
    case "blocked":
      return "Blocked";
    case "skipped":
      return "Skipped";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function buildWorkflowSteps(input: {
  readonly actionSteps: readonly AiBusinessActionStep[];
  readonly requiresConfirmation: boolean;
  readonly executable: boolean;
}): readonly AiBusinessWorkflowStep[] {
  if (input.actionSteps.length === 0) {
    return Object.freeze([
      Object.freeze({
        id: "wf.step.idle",
        label: "No workflow steps required",
        order: 1,
        status: "skipped" as const,
        sourceActionStepId: null,
      }),
    ]);
  }

  const steps = input.actionSteps.slice(0, 8).map((step, index) => {
    let status: AiBusinessWorkflowStepStatus = "pending";
    if (!input.executable) {
      status = "skipped";
    } else if (input.requiresConfirmation && index === 0) {
      status = "ready";
    } else if (!input.requiresConfirmation && index === 0) {
      status = "ready";
    } else if (input.requiresConfirmation && index > 0) {
      status = "blocked";
    } else {
      status = "pending";
    }

    return Object.freeze({
      id: `wf.${step.id}`,
      label: sanitizeWorkflowText(step.label, 80),
      order: step.order || index + 1,
      status,
      sourceActionStepId: step.id,
    });
  });

  return Object.freeze(steps);
}
