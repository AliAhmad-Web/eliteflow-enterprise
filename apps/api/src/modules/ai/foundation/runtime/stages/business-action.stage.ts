import type { AiPipelineStage } from "./stage.js";
import { isAiBusinessActionEngineEnabled } from "../../feature-flags.js";
import { resolveBusinessAction } from "../../business-action/business-action-engine.js";

/**
 * Business Action Stage.
 * Converts Business Decisions into structured Action Plans after Decision
 * and before Memory. Never executes actions, tools, or service calls.
 * Skipped when AI_BUSINESS_ACTION_ENGINE=false (complete no-op).
 */
export const businessActionStage: AiPipelineStage = {
  name: "business-action",
  async run(state) {
    if (!isAiBusinessActionEngineEnabled()) {
      return {
        ...state,
        businessAction: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        businessAction: Object.freeze({
          kind: "none" as const,
          plan: Object.freeze({
            steps: Object.freeze([]),
            plannedAt: new Date().toISOString(),
            executable: false,
          }),
          priority: "low" as const,
          risk: Object.freeze({
            level: "low" as const,
            summary: "Action planning withheld in privacy mode.",
          }),
          permissions: Object.freeze({
            requirement: "none" as const,
            keys: Object.freeze([]),
            requiresConfirmation: false,
          }),
          confidence: 0,
          summary: "Action planning withheld in privacy mode.",
          notes: Object.freeze(["privacy-mode"]),
        }),
      };
    }

    const businessAction = resolveBusinessAction({
      businessDecision: state.businessDecision,
      businessQuery: state.businessQuery,
    });

    return {
      ...state,
      businessAction,
    };
  },
};
