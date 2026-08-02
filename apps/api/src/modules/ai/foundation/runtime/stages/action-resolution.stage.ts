import type { AiPipelineStage } from "./stage.js";
import { isAiActionFrameworkEnabled } from "../../feature-flags.js";
import { resolveActiveAction } from "../../action/action-resolver.js";
import { buildActionContext } from "../../action/action-context.js";

/**
 * Action Resolution Stage.
 * Resolves the active enterprise action after Business Execution and before
 * Memory / Tool Registry. Never executes actions or calls services.
 * Skipped when AI_ACTION_FRAMEWORK=false (complete no-op).
 */
export const actionResolutionStage: AiPipelineStage = {
  name: "action-resolution",
  async run(state) {
    if (!isAiActionFrameworkEnabled()) {
      return {
        ...state,
        activeAction: undefined,
        actionContext: undefined,
      };
    }

    if (state.policy.privacyMode) {
      const resolved = resolveActiveAction({
        activeContext: state.activeContext,
        actionId: "action.generic",
      });
      const actionContext = buildActionContext({
        activeAction: resolved.activeAction,
        sources: Object.freeze(["privacy"]),
      });
      return {
        ...state,
        activeAction: resolved.activeAction,
        actionContext,
      };
    }

    const resolved = resolveActiveAction({
      activeContext: state.activeContext,
      activeAgent: state.activeAgent,
      agentDecision: state.agentDecision,
      businessQuery: state.businessQuery,
      selectedModules: state.selectedModules,
      businessExecution: state.businessExecution,
      mode: state.mode ?? state.activeContext.mode,
      prompt: state.prompt,
      actionId: state.contextHints?.actionId ?? null,
    });

    const actionContext = buildActionContext({
      activeAction: resolved.activeAction,
      sources: resolved.sources,
    });

    return {
      ...state,
      activeAction: resolved.activeAction,
      actionContext,
    };
  },
};
