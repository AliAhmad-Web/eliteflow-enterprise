import type { AiPipelineStage } from "./stage.js";
import { resolveEligibleTools } from "../../tools/resolve-eligible-tools.js";

/**
 * Tool Eligibility Stage.
 * Prepares which tools may run later — never executes them.
 * Uses discovered tools when present; otherwise static catalog.
 */
export const toolStage: AiPipelineStage = {
  name: "tool-eligibility",
  async run(state) {
    const toolExecutions = await resolveEligibleTools({
      userId: state.userId,
      activeContext: state.activeContext,
      policy: state.policy,
      contextHints: state.contextHints,
      catalog: state.discoveredTools,
    });

    return {
      ...state,
      toolExecutions,
    };
  },
};
