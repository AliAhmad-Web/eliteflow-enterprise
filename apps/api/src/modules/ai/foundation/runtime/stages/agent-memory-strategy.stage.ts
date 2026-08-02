import type { AiPipelineStage } from "./stage.js";
import { isAiAgentMemoryStrategyEnabled } from "../../feature-flags.js";
import { resolveAgentMemoryStrategy } from "../../agents/resolve-agent-memory-strategy.js";

/**
 * Agent Memory Strategy Stage.
 * Resolves an immutable memory strategy after Agent Prompt Strategy and before Memory.
 * Skipped when AI_AGENT_MEMORY_STRATEGY=false.
 */
export const agentMemoryStrategyStage: AiPipelineStage = {
  name: "agent-memory-strategy",
  async run(state) {
    if (!isAiAgentMemoryStrategyEnabled() || !state.activeAgent) {
      return {
        ...state,
        agentMemoryStrategy: undefined,
      };
    }

    const agentMemoryStrategy = resolveAgentMemoryStrategy({
      activeAgent: state.activeAgent,
      agentContext: state.agentContext,
    });

    return {
      ...state,
      agentMemoryStrategy,
    };
  },
};
