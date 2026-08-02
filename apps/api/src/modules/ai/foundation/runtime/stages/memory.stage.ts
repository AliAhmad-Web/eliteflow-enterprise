import type { AiPipelineStage } from "./stage.js";
import { isAiAgentMemoryStrategyEnabled } from "../../feature-flags.js";
import { prepareProviderHistory } from "../../memory/prepare-provider-history.js";

/**
 * Memory Stage — prepare provider-ready conversation history.
 * Honors historyEnabled / privacyMode and applies a sliding window.
 * When AI_AGENT_MEMORY_STRATEGY is enabled, consumes state.agentMemoryStrategy.
 * When disabled, behaves exactly as before (generic sliding window).
 * Does not write to DB or modify the current user prompt / USER history content.
 */
export const memoryStage: AiPipelineStage = {
  name: "memory",
  async run(state) {
    const strategyEnabled = isAiAgentMemoryStrategyEnabled();
    const agentMemoryStrategy =
      strategyEnabled && state.agentMemoryStrategy
        ? state.agentMemoryStrategy
        : undefined;

    const providerHistory = prepareProviderHistory({
      conversationHistory: state.conversationHistory,
      policy: state.policy,
      agentMemoryStrategy,
    });

    return {
      ...state,
      // Privacy: drop prior turns from runtime carrier after preparing egress history.
      conversationHistory: state.policy.privacyMode
        ? []
        : state.conversationHistory,
      providerHistory,
    };
  },
};
