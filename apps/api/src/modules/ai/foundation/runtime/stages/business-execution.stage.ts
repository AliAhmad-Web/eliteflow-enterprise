import type { AiPipelineStage } from "./stage.js";
import { isAiBusinessExecutionEnabled } from "../../feature-flags.js";
import { resolveBusinessExecution } from "../../business-execution/business-execution-engine.js";

/**
 * Business Execution Stage.
 * Builds structured execution plans from Business Recommendations after
 * Recommendation and before Memory. Never executes actions or tools.
 * Skipped when AI_BUSINESS_EXECUTION=false (complete no-op).
 */
export const businessExecutionStage: AiPipelineStage = {
  name: "business-execution",
  async run(state) {
    if (!isAiBusinessExecutionEnabled()) {
      return {
        ...state,
        businessExecution: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        businessExecution: Object.freeze({
          plan: Object.freeze({
            id: "exec.plan.privacy",
            name: "Privacy Mode Plan",
            phases: Object.freeze([]),
            milestones: Object.freeze([]),
            dependencies: Object.freeze([]),
            plannedAt: new Date().toISOString(),
            executable: false,
          }),
          timeline: Object.freeze({
            horizon: "medium-term" as const,
            phaseCount: 0,
            milestoneCount: 0,
            summary: "Execution planning withheld in privacy mode.",
          }),
          resources: Object.freeze([]),
          kpis: Object.freeze([]),
          risks: Object.freeze([]),
          rollback: Object.freeze({
            steps: Object.freeze([]),
            summary: "Execution planning withheld in privacy mode.",
          }),
          confidence: 0,
          summary: "Execution planning withheld in privacy mode.",
          notes: Object.freeze(["privacy-mode"]),
        }),
      };
    }

    const businessExecution = resolveBusinessExecution({
      businessRecommendation: state.businessRecommendation,
    });

    return {
      ...state,
      businessExecution,
    };
  },
};
