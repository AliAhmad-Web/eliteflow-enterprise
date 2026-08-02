import type { AiPipelineStage } from "./stage.js";
import { isAiWorkflowOrchestrationEnabled } from "../../feature-flags.js";
import { orchestrateWorkflow } from "../../workflow/workflow-orchestrator.js";

/**
 * Workflow Orchestration Stage.
 * Builds immutable enterprise workflow plans after Action Planning and before
 * Memory. Never executes workflows, actions, or tools.
 * Skipped when AI_WORKFLOW_ORCHESTRATION=false (complete no-op).
 */
export const workflowOrchestrationStage: AiPipelineStage = {
  name: "workflow-orchestration",
  async run(state) {
    if (!isAiWorkflowOrchestrationEnabled()) {
      return {
        ...state,
        workflowPlan: undefined,
      };
    }

    const workflowPlan = orchestrateWorkflow({
      actionPlan: state.actionPlan,
      privacyMode: state.policy.privacyMode,
    });

    return {
      ...state,
      workflowPlan,
    };
  },
};
