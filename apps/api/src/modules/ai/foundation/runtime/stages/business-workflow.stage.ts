import type { AiPipelineStage } from "./stage.js";
import { isAiBusinessWorkflowEngineEnabled } from "../../feature-flags.js";
import { resolveBusinessWorkflow } from "../../business-workflow/business-workflow-engine.js";

/**
 * Business Workflow Stage.
 * Converts Business Actions into structured Workflows after Action
 * and before Memory. Never executes workflows, tools, or service calls.
 * Skipped when AI_BUSINESS_WORKFLOW_ENGINE=false (complete no-op).
 */
export const businessWorkflowStage: AiPipelineStage = {
  name: "business-workflow",
  async run(state) {
    if (!isAiBusinessWorkflowEngineEnabled()) {
      return {
        ...state,
        businessWorkflow: undefined,
      };
    }

    const businessWorkflow = resolveBusinessWorkflow({
      businessAction: state.businessAction,
      privacyMode: state.policy.privacyMode,
    });

    return {
      ...state,
      businessWorkflow,
    };
  },
};
