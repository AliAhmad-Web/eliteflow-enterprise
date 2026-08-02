/**
 * Workflow conditions — planning gates only.
 * Never executes.
 */

export interface AiWorkflowCondition {
  readonly id: string;
  readonly label: string;
  readonly satisfied: boolean;
  readonly required: boolean;
}

function sanitize(value: string, max = 100): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildWorkflowConditions(input: {
  readonly hasActionPlan: boolean;
  readonly planValid: boolean;
  readonly privacyMode: boolean;
  readonly requiresApproval: boolean;
}): readonly AiWorkflowCondition[] {
  return Object.freeze([
    Object.freeze({
      id: "cond.action.plan",
      label: sanitize("Action plan present"),
      satisfied: input.hasActionPlan,
      required: true,
    }),
    Object.freeze({
      id: "cond.plan.valid",
      label: sanitize("Action plan structurally valid"),
      satisfied: input.planValid,
      required: true,
    }),
    Object.freeze({
      id: "cond.privacy",
      label: sanitize("Privacy mode allows orchestration detail"),
      satisfied: !input.privacyMode,
      required: false,
    }),
    Object.freeze({
      id: "cond.no.execution",
      label: sanitize("Orchestration is planning-only"),
      satisfied: true,
      required: true,
    }),
    Object.freeze({
      id: "cond.approval",
      label: sanitize("Approval gate recorded when required"),
      satisfied: true,
      required: input.requiresApproval,
    }),
  ]);
}
