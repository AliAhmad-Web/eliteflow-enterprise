import type { AiPipelineStage } from "./stage.js";
import { isAiBusinessDecisionEnabled } from "../../feature-flags.js";
import { resolveBusinessDecision } from "../../business-decision/business-decision-engine.js";

/**
 * Business Decision Stage.
 * Builds structured decisions from Business Reasoning after reasoning
 * and before Memory. Never executes actions, tools, or service calls.
 * Skipped when AI_BUSINESS_DECISION=false (complete no-op).
 */
export const businessDecisionStage: AiPipelineStage = {
  name: "business-decision",
  async run(state) {
    if (!isAiBusinessDecisionEnabled()) {
      return {
        ...state,
        businessDecision: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        businessDecision: Object.freeze({
          options: Object.freeze([]),
          priority: "low" as const,
          impact: Object.freeze({
            level: "minimal" as const,
            summary: "Decision withheld in privacy mode.",
          }),
          risk: Object.freeze({
            level: "low" as const,
            summary: "Decision withheld in privacy mode.",
          }),
          recommendation: Object.freeze({
            action: "no_action" as const,
            text: "Decision withheld in privacy mode.",
          }),
          confidence: 0,
          reasoningSummary: "Decision withheld in privacy mode.",
          execution: Object.freeze({
            mode: "advise-only" as const,
            selectedOptionId: null,
            requiresConfirmation: false,
            actionable: false,
          }),
          notes: Object.freeze(["privacy-mode"]),
        }),
      };
    }

    const businessDecision = resolveBusinessDecision({
      businessReasoning: state.businessReasoning,
      businessQuery: state.businessQuery,
    });

    return {
      ...state,
      businessDecision,
    };
  },
};
