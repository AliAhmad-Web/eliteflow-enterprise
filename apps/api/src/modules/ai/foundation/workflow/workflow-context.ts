/**
 * Workflow context — safe orchestration signals.
 * Never executes.
 */

export interface AiWorkflowContext {
  readonly actionPlanId: string | null;
  readonly actionName: string | null;
  readonly priority: string;
  readonly riskLevel: string;
  readonly sources: readonly string[];
}

export function buildWorkflowContext(input: {
  readonly actionPlanId?: string | null;
  readonly actionName?: string | null;
  readonly priority: string;
  readonly riskLevel: string;
  readonly sources?: readonly string[];
}): AiWorkflowContext {
  return Object.freeze({
    actionPlanId: input.actionPlanId ?? null,
    actionName: input.actionName ?? null,
    priority: input.priority,
    riskLevel: input.riskLevel,
    sources: Object.freeze([...(input.sources ?? ["action-plan"])]),
  });
}
