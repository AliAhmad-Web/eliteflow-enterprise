import type { AiPipelineStage } from "./stage.js";
import { isAiAgentCollaborationEnabled } from "../../feature-flags.js";
import { resolveAgentCollaboration } from "../../agents/resolve-agent-collaboration.js";

/**
 * Agent Collaboration Stage.
 * Resolves immutable multi-agent collaboration metadata after Agent Decision
 * and before Memory. Never executes agents or tools.
 * Skipped when AI_AGENT_COLLABORATION=false.
 */
export const agentCollaborationStage: AiPipelineStage = {
  name: "agent-collaboration",
  async run(state) {
    if (!isAiAgentCollaborationEnabled() || !state.activeAgent) {
      return {
        ...state,
        agentCollaboration: undefined,
      };
    }

    const agentCollaboration = resolveAgentCollaboration({
      activeAgent: state.activeAgent,
      agentDecision: state.agentDecision,
      activeContext: state.activeContext,
    });

    return {
      ...state,
      agentCollaboration,
    };
  },
};
