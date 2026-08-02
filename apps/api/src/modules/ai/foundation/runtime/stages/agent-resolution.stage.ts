import type { AiPipelineStage } from "./stage.js";
import { isAiAgentFrameworkEnabled } from "../../feature-flags.js";
import { resolveActiveAgent } from "../../agents/agent-resolver.js";

/**
 * Agent Resolution Stage.
 * Resolves the active specialized agent before Memory / Tool / Prompt Engineering.
 * Runs after Policy, Context, and Provider Resolution — never bypasses them.
 * Skipped when AI_AGENT_FRAMEWORK=false.
 */
export const agentResolutionStage: AiPipelineStage = {
  name: "agent-resolution",
  async run(state) {
    if (!isAiAgentFrameworkEnabled()) {
      return {
        ...state,
        activeAgent: undefined,
      };
    }

    const activeAgent = resolveActiveAgent({
      activeContext: state.activeContext,
      policy: state.policy,
      mode: state.mode ?? state.activeContext.mode,
      agentId: state.contextHints?.agentId ?? null,
    });

    return {
      ...state,
      activeAgent,
    };
  },
};
