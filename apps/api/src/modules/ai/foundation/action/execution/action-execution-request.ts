/**
 * Action execution request — immutable input for the engine.
 */

import type { AiActionPlan } from "../planning/ai-action-plan.js";
import type { AiActiveAction } from "../ai-action.js";
import type { AiActionContext } from "../action-context.js";
import type { AiWorkflowPlan } from "../../workflow/workflow-instance.js";

export type AiActionExecutionMode =
  | "single"
  | "multi-step"
  | "transactional";

export interface AiActionExecutionRequest {
  readonly actionPlan: AiActionPlan | null;
  readonly activeAction: AiActiveAction | null;
  readonly actionContext: AiActionContext | null;
  readonly workflowPlan: AiWorkflowPlan | null;
  readonly mode: AiActionExecutionMode;
  readonly requestedAt: string;
}

export function resolveExecutionMode(input: {
  readonly stepCount: number;
  readonly requiresApproval: boolean;
  readonly transactionalPreferred?: boolean;
}): AiActionExecutionMode {
  if (input.stepCount <= 1) return "single";
  if (input.transactionalPreferred || input.requiresApproval) {
    return "transactional";
  }
  return "multi-step";
}

export function buildActionExecutionRequest(input: {
  readonly actionPlan?: AiActionPlan | null;
  readonly activeAction?: AiActiveAction | null;
  readonly actionContext?: AiActionContext | null;
  readonly workflowPlan?: AiWorkflowPlan | null;
}): AiActionExecutionRequest {
  const plan = input.actionPlan ?? null;
  const mode = resolveExecutionMode({
    stepCount: plan?.plan.steps.length ?? 0,
    requiresApproval: plan?.approval.required ?? false,
    transactionalPreferred: (plan?.plan.steps.length ?? 0) >= 4,
  });

  return Object.freeze({
    actionPlan: plan,
    activeAction: input.activeAction ?? null,
    actionContext: input.actionContext ?? null,
    workflowPlan: input.workflowPlan ?? null,
    mode,
    requestedAt: new Date().toISOString(),
  });
}
