/**
 * Workflow Orchestrator — entry point for enterprise workflow planning.
 * Never executes workflows. Never calls services. Never invokes tools.
 */

import type { AiActionPlan } from "../action/planning/ai-action-plan.js";
import type { AiWorkflowPlan } from "./workflow-instance.js";
import {
  resolveWorkflowPlan,
  type ResolveWorkflowPlanInput,
} from "./workflow-engine.js";

export interface OrchestrateWorkflowInput extends ResolveWorkflowPlanInput {
  readonly actionPlan?: AiActionPlan | null;
}

/**
 * Orchestrate an immutable workflow plan from the action plan.
 * Planning metadata only.
 */
export function orchestrateWorkflow(
  input: OrchestrateWorkflowInput,
): AiWorkflowPlan {
  return resolveWorkflowPlan(input);
}

export const workflowOrchestrator = Object.freeze({
  orchestrate: orchestrateWorkflow,
});
