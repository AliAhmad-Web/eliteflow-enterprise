import type { AiPipelineStage } from "./stage.js";
import { isAiToolResultValidationEnabled } from "../../feature-flags.js";
import { validateToolResults } from "../../tools/tool-result-validation.js";

/**
 * Tool Result Validation Stage.
 * Validates/sanitizes completed tool outputs before injection.
 * Skipped when AI_TOOL_RESULT_VALIDATION=false.
 */
export const toolResultValidationStage: AiPipelineStage = {
  name: "tool-result-validation",
  async run(state) {
    if (!isAiToolResultValidationEnabled()) {
      return {
        ...state,
        validatedToolResults: undefined,
      };
    }

    const confidenceByToolId = new Map<string, number>();
    if (state.toolSelectionResult?.decisions) {
      for (const decision of state.toolSelectionResult.decisions) {
        if (decision.selected) {
          confidenceByToolId.set(decision.toolId, decision.confidence);
        }
      }
    }

    const validatedToolResults = validateToolResults({
      executions: state.toolExecutions,
      policy: state.policy,
      activeContext: state.activeContext,
      permissions: state.contextHints?.permissions,
      role: state.activeContext.user?.role ?? state.contextHints?.role,
      userId: state.userId,
      explicitRestrictedAccess:
        state.contextHints?.explicitRestrictedAccess === true,
      catalog: state.discoveredTools,
      confidenceByToolId,
    });

    return {
      ...state,
      validatedToolResults,
    };
  },
};
