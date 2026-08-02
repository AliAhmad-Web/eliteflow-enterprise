import type { AiPipelineStage } from "./stage.js";
import { isAiBusinessRecommendationEnabled } from "../../feature-flags.js";
import { resolveBusinessRecommendation } from "../../business-recommendation/business-recommendation-engine.js";

/**
 * Business Recommendation Stage.
 * Generates structured recommendations from Business Intelligence after BI
 * and before Memory. Never executes actions, tools, or service calls.
 * Skipped when AI_BUSINESS_RECOMMENDATION=false (complete no-op).
 */
export const businessRecommendationStage: AiPipelineStage = {
  name: "business-recommendation",
  async run(state) {
    if (!isAiBusinessRecommendationEnabled()) {
      return {
        ...state,
        businessRecommendation: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        businessRecommendation: Object.freeze({
          items: Object.freeze([]),
          priority: "low" as const,
          impact: Object.freeze({
            level: "minimal" as const,
            summary: "Recommendations withheld in privacy mode.",
          }),
          benefits: Object.freeze([]),
          risks: Object.freeze([]),
          confidence: 0,
          summary: "Recommendations withheld in privacy mode.",
          notes: Object.freeze(["privacy-mode"]),
        }),
      };
    }

    const businessRecommendation = resolveBusinessRecommendation({
      businessIntelligence: state.businessIntelligence,
    });

    return {
      ...state,
      businessRecommendation,
    };
  },
};
