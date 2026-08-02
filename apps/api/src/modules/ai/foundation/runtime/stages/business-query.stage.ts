import type { AiPipelineStage } from "./stage.js";
import { isAiBusinessQueryEngineEnabled } from "../../feature-flags.js";
import { resolveBusinessQuery } from "../../business-query/business-query-engine.js";

/**
 * Business Query Stage.
 * Builds a structured Business Query after Agent stages and before Module Resolution.
 * Never executes. Skipped when AI_BUSINESS_QUERY_ENGINE=false (complete no-op).
 */
export const businessQueryStage: AiPipelineStage = {
  name: "business-query",
  async run(state) {
    if (!isAiBusinessQueryEngineEnabled()) {
      return {
        ...state,
        businessQuery: undefined,
      };
    }

    const businessQuery = resolveBusinessQuery({
      prompt: state.prompt,
      mode: state.mode ?? state.activeContext.mode,
      activeContext: state.activeContext,
      activeAgent: state.activeAgent,
      agentDecision: state.agentDecision,
    });

    return {
      ...state,
      businessQuery,
    };
  },
};
