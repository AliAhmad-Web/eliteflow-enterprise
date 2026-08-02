/**
 * Action execution approval gates.
 * Never notifies approvers — evaluates plan metadata only.
 */

import type { AiActionPlan } from "../planning/ai-action-plan.js";

export interface AiActionExecutionApprovalGate {
  readonly required: boolean;
  readonly cleared: boolean;
  readonly level: string;
  readonly reason: string;
  readonly blocksExecution: boolean;
}

export function evaluateExecutionApproval(
  actionPlan: AiActionPlan | null | undefined,
): AiActionExecutionApprovalGate {
  if (!actionPlan) {
    return Object.freeze({
      required: false,
      cleared: true,
      level: "none",
      reason: "no-action-plan",
      blocksExecution: false,
    });
  }

  const required = actionPlan.approval.required;
  // Pipeline does not clear human approval in this stage — required gates block.
  const cleared = !required;

  return Object.freeze({
    required,
    cleared,
    level: actionPlan.approval.level,
    reason: actionPlan.approval.reason,
    blocksExecution: required && !cleared,
  });
}
