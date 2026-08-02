import type { AiPipelineStage } from "./stage.js";
import { isAiToolRoutingEnabled } from "../../feature-flags.js";
import { routeTools } from "../../tools/tool-routing-engine.js";

/**
 * Tool Routing Stage.
 * Selects/prioritizes eligible tools for execution — never executes them.
 * Skipped when AI_TOOL_ROUTING=false (execution uses all eligible tools).
 */
export const toolRoutingStage: AiPipelineStage = {
  name: "tool-routing",
  async run(state) {
    if (!isAiToolRoutingEnabled()) {
      return {
        ...state,
        toolRoutingDecision: undefined,
      };
    }

    const toolRoutingDecision = routeTools({
      providerRequest: state.providerRequest ?? null,
      activeContext: state.activeContext,
      eligibleTools: state.toolExecutions,
      policy: state.policy,
      userPrompt: state.prompt ?? "",
      mode: state.mode ?? state.activeContext.mode,
      permissions: state.contextHints?.permissions,
      catalog: state.discoveredTools,
    });

    return {
      ...state,
      toolRoutingDecision,
    };
  },
};
