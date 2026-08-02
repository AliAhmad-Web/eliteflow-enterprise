import type { AiPipelineStage } from "./stage.js";
import { isAiAgentAnalyticsEnabled } from "../../feature-flags.js";
import {
  buildAgentAnalytics,
  emitAgentAnalyticsLog,
} from "../../agents/build-agent-analytics.js";

/**
 * Agent Analytics Stage.
 * Builds immutable agent analytics after Tool Audit and before Prompt Engineering.
 * Emits one structured analytics event. Never executes agents or tools.
 * Skipped when AI_AGENT_ANALYTICS=false. Failures never interrupt the pipeline.
 */
export const agentAnalyticsStage: AiPipelineStage = {
  name: "agent-analytics",
  async run(state) {
    if (!isAiAgentAnalyticsEnabled()) {
      return {
        ...state,
        agentAnalytics: undefined,
      };
    }

    try {
      const agentAnalytics = buildAgentAnalytics({
        activeAgent: state.activeAgent,
        agentDecision: state.agentDecision,
        agentCollaboration: state.agentCollaboration,
        agentPermissions: state.agentPermissions,
        toolExecutionPlan: state.toolExecutionPlan,
        toolExecutions: state.toolExecutions,
      });

      emitAgentAnalyticsLog(agentAnalytics);

      return {
        ...state,
        agentAnalytics,
      };
    } catch {
      // Analytics failures must never interrupt the AI pipeline.
      return {
        ...state,
        agentAnalytics: undefined,
      };
    }
  },
};
