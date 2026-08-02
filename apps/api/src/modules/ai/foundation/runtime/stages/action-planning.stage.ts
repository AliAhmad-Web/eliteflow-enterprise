import type { AiPipelineStage } from "./stage.js";
import { isAiActionPlanningEnabled } from "../../feature-flags.js";
import { resolveActionPlan } from "../../action/planning/action-plan-engine.js";

/**
 * Action Planning Stage.
 * Builds immutable action plans after Action Resolution and before
 * Workflow Orchestration / Memory. Never executes actions or tools.
 * Skipped when AI_ACTION_PLANNING=false (complete no-op).
 */
export const actionPlanningStage: AiPipelineStage = {
  name: "action-planning",
  async run(state) {
    if (!isAiActionPlanningEnabled()) {
      return {
        ...state,
        actionPlan: undefined,
      };
    }

    const actionPlan = resolveActionPlan({
      activeAction: state.activeAction,
      actionContext: state.actionContext,
      privacyMode: state.policy.privacyMode,
    });

    return {
      ...state,
      actionPlan,
    };
  },
};
