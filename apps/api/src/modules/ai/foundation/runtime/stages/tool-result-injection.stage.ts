import type { AiPipelineStage } from "./stage.js";
import {
  isAiToolResultInjectionEnabled,
  isAiToolResultInjectionIncludeFailedEnabled,
  isAiToolResultValidationEnabled,
} from "../../feature-flags.js";
import { formatToolResultsForRuntime } from "../../tools/format-tool-results-for-runtime.js";
import { validatedResultsToExecutions } from "../../tools/tool-result-validation.js";

/**
 * Tool Result Injection Stage.
 * Formats successful tool outputs into runtime metadata for Prompt Engineering.
 * When validation is enabled, consumes only accepted validatedToolResults.
 * When validation is disabled, uses toolExecutions exactly as before.
 */
export const toolResultInjectionStage: AiPipelineStage = {
  name: "tool-result-injection",
  async run(state) {
    if (!isAiToolResultInjectionEnabled() || state.policy.privacyMode) {
      return {
        ...state,
        toolResultRuntime: undefined,
      };
    }

    const includeFailed = isAiToolResultInjectionIncludeFailedEnabled();

    const sourceExecutions =
      isAiToolResultValidationEnabled() && state.validatedToolResults
        ? validatedResultsToExecutions(state.validatedToolResults)
        : state.toolExecutions;

    const toolResultRuntime = formatToolResultsForRuntime(sourceExecutions, {
      includeFailed,
    });

    return {
      ...state,
      toolResultRuntime: toolResultRuntime || undefined,
    };
  },
};
