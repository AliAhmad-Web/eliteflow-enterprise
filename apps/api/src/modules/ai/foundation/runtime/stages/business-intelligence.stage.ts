import type { AiPipelineStage } from "./stage.js";
import { isAiBusinessIntelligenceEnabled } from "../../feature-flags.js";
import { resolveBusinessIntelligence } from "../../business-intelligence/business-intelligence-engine.js";

/**
 * Business Intelligence Stage.
 * Analyzes existing runtime signals after Business Workflow and before Memory.
 * Never queries databases, calls services, or executes tools.
 * Skipped when AI_BUSINESS_INTELLIGENCE=false (complete no-op).
 */
export const businessIntelligenceStage: AiPipelineStage = {
  name: "business-intelligence",
  async run(state) {
    if (!isAiBusinessIntelligenceEnabled()) {
      return {
        ...state,
        businessIntelligence: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        businessIntelligence: Object.freeze({
          kpis: Object.freeze([]),
          metrics: Object.freeze([]),
          trends: Object.freeze([]),
          insights: Object.freeze([]),
          forecast: Object.freeze({
            outlook: "neutral" as const,
            horizon: "near-term" as const,
            summary: "Intelligence withheld in privacy mode.",
          }),
          health: Object.freeze({
            level: "fair" as const,
            score: 0,
            summary: "Intelligence withheld in privacy mode.",
          }),
          opportunities: Object.freeze([]),
          alerts: Object.freeze([
            Object.freeze({
              id: "alert.privacy",
              severity: "info" as const,
              text: "Intelligence withheld in privacy mode.",
            }),
          ]),
          overallScore: 0,
          summary: "Intelligence withheld in privacy mode.",
          confidence: 0,
          notes: Object.freeze(["privacy-mode"]),
        }),
      };
    }

    const businessIntelligence = resolveBusinessIntelligence({
      moduleData: state.moduleData,
      businessQuery: state.businessQuery,
      businessReasoning: state.businessReasoning,
      businessDecision: state.businessDecision,
      businessAction: state.businessAction,
      businessWorkflow: state.businessWorkflow,
    });

    return {
      ...state,
      businessIntelligence,
    };
  },
};
