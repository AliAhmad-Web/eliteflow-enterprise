import type { AiPipelineStage } from "./stage.js";
import { isAiAgentPromptStrategyEnabled } from "../../feature-flags.js";
import { resolveAgentPromptStrategy } from "../../agents/resolve-agent-prompt-strategy.js";

/**
 * Agent Prompt Strategy Stage.
 * Resolves an immutable prompt strategy after Agent Context.
 * Skipped when AI_AGENT_PROMPT_STRATEGY=false.
 */
export const agentPromptStrategyStage: AiPipelineStage = {
  name: "agent-prompt-strategy",
  async run(state) {
    if (!isAiAgentPromptStrategyEnabled() || !state.activeAgent) {
      return {
        ...state,
        agentPromptStrategy: undefined,
      };
    }

    const agentPromptStrategy = resolveAgentPromptStrategy({
      activeAgent: state.activeAgent,
      agentContext: state.agentContext,
    });

    return {
      ...state,
      agentPromptStrategy,
    };
  },
};
