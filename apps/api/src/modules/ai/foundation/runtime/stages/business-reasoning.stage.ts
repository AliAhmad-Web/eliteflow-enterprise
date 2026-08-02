import type { AiPipelineStage } from "./stage.js";
import { isAiBusinessReasoningEnabled } from "../../feature-flags.js";
import { resolveBusinessReasoning } from "../../business-reasoning/business-reasoning-engine.js";

/**
 * Business Reasoning Stage.
 * Analyzes already-fetched moduleData after Module Data and before Memory.
 * Never queries databases, calls services, or executes tools.
 * Skipped when AI_BUSINESS_REASONING=false (complete no-op).
 */
export const businessReasoningStage: AiPipelineStage = {
  name: "business-reasoning",
  async run(state) {
    if (!isAiBusinessReasoningEnabled()) {
      return {
        ...state,
        businessReasoning: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        businessReasoning: Object.freeze({
          summary: "Reasoning withheld in privacy mode.",
          analysis: Object.freeze([]),
          insights: Object.freeze([]),
          risks: Object.freeze([]),
          priorities: Object.freeze([]),
          recommendations: Object.freeze([]),
          confidence: 0,
          notes: Object.freeze(["privacy-mode"]),
        }),
      };
    }

    const businessReasoning = resolveBusinessReasoning({
      moduleData: state.moduleData,
      businessQuery: state.businessQuery,
    });

    return {
      ...state,
      businessReasoning,
    };
  },
};
