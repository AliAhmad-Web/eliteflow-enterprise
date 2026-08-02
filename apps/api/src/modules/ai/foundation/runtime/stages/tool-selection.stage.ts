import type { AiPipelineStage } from "./stage.js";
import {
  isAiIntelligentToolSelectionEnabled,
  isAiToolRoutingEnabled,
} from "../../feature-flags.js";
import { selectTools } from "../../tools/tool-selection-engine.js";

/**
 * Intelligent Tool Selection Stage.
 * Narrows routed/eligible tools to the minimum required set before planning.
 * Skipped when AI_INTELLIGENT_TOOL_SELECTION=false.
 */
export const toolSelectionStage: AiPipelineStage = {
  name: "tool-selection",
  async run(state) {
    if (!isAiIntelligentToolSelectionEnabled()) {
      return {
        ...state,
        toolSelectionResult: undefined,
      };
    }

    const routingEnabled = isAiToolRoutingEnabled();
    const routedTools =
      routingEnabled && state.toolRoutingDecision
        ? state.toolRoutingDecision.selectedTools
        : null;

    const toolSelectionResult = selectTools({
      userPrompt: state.prompt ?? "",
      mode: state.mode ?? state.activeContext.mode,
      activeContext: state.activeContext,
      policy: state.policy,
      eligibleTools: state.toolExecutions,
      routedTools,
      permissions: state.contextHints?.permissions,
      catalog: state.discoveredTools,
    });

    return {
      ...state,
      toolSelectionResult,
    };
  },
};
