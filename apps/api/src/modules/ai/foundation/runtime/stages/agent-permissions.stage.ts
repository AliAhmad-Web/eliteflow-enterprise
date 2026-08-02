import type { AiPipelineStage } from "./stage.js";
import { isAiAgentSecurityEnabled } from "../../feature-flags.js";
import { resolveAgentPermissions } from "../../agents/resolve-agent-permissions.js";

/**
 * Agent Permissions Stage.
 * Resolves immutable agent permission boundaries after Agent Collaboration
 * and before Memory. Never executes tools or agents.
 * Skipped when AI_AGENT_SECURITY=false.
 */
export const agentPermissionsStage: AiPipelineStage = {
  name: "agent-permissions",
  async run(state) {
    if (!isAiAgentSecurityEnabled() || !state.activeAgent) {
      return {
        ...state,
        agentPermissions: undefined,
      };
    }

    const agentPermissions = resolveAgentPermissions({
      activeAgent: state.activeAgent,
      activeContext: state.activeContext,
      agentDecision: state.agentDecision,
    });

    return {
      ...state,
      agentPermissions,
    };
  },
};
