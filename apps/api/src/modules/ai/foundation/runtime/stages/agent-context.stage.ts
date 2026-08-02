import type { AiPipelineStage } from "./stage.js";
import { isAiAgentContextEnabled } from "../../feature-flags.js";
import { buildAgentContext } from "../../agents/build-agent-context.js";

/**
 * Agent Context Stage.
 * Builds immutable agent capabilities/context after Agent Resolution.
 * Skipped when AI_AGENT_CONTEXT=false (exact prior pipeline behavior).
 */
export const agentContextStage: AiPipelineStage = {
  name: "agent-context",
  async run(state) {
    if (!isAiAgentContextEnabled() || !state.activeAgent) {
      return {
        ...state,
        agentContext: undefined,
      };
    }

    const agentContext = buildAgentContext({
      activeAgent: state.activeAgent,
      toolExecutions: state.toolExecutions,
    });

    return {
      ...state,
      agentContext,
    };
  },
};
