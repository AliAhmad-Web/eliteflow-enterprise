import type { AiPipelineStage } from "./stage.js";
import { isAiAgentDecisionEngineEnabled } from "../../feature-flags.js";
import { resolveAgentDecision } from "../../agents/resolve-agent-decision.js";

/**
 * Agent Decision Stage.
 * Resolves immutable runtime decisions after Agent Memory Strategy and before Memory.
 * Never executes tools. Skipped when AI_AGENT_DECISION_ENGINE=false.
 */
export const agentDecisionStage: AiPipelineStage = {
  name: "agent-decision",
  async run(state) {
    if (!isAiAgentDecisionEngineEnabled() || !state.activeAgent) {
      return {
        ...state,
        agentDecision: undefined,
      };
    }

    const agentDecision = resolveAgentDecision({
      activeAgent: state.activeAgent,
      agentContext: state.agentContext,
      agentPromptStrategy: state.agentPromptStrategy,
      agentMemoryStrategy: state.agentMemoryStrategy,
      activeContext: state.activeContext,
    });

    return {
      ...state,
      agentDecision,
    };
  },
};
