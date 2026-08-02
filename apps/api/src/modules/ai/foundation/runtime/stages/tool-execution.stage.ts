import type { AiPipelineStage } from "./stage.js";
import {
  isAiIntelligentToolSelectionEnabled,
  isAiToolExecutionEnabled,
  isAiToolExecutionPlannerEnabled,
  isAiToolRoutingEnabled,
} from "../../feature-flags.js";
import { executeEligibleTools } from "../../tools/tool-execution-engine.js";
import type { AiToolExecution } from "../../contracts/ai-tool-execution.js";
import { applyToolSelection } from "../../tools/tool-selection-engine.js";

/**
 * Apply routing selection: non-selected eligible tools become skipped.
 * Preserved exactly for AI_INTELLIGENT_TOOL_SELECTION=false rollback.
 */
function applyRoutingSelection(
  executions: readonly AiToolExecution[],
  selectedTools: readonly AiToolExecution[] | undefined,
  routingEnabled: boolean,
): readonly AiToolExecution[] {
  if (!routingEnabled || !selectedTools) {
    return executions;
  }

  const selectedIds = new Set(selectedTools.map((tool) => tool.toolId));

  return executions.map((execution) => {
    if (execution.status !== "eligible") {
      return execution;
    }
    if (selectedIds.has(execution.toolId)) {
      return execution;
    }
    return {
      ...execution,
      status: "skipped" as const,
    };
  });
}

/**
 * Tool Execution Stage.
 * Runs selected/eligible tools via the Tool Execution Engine.
 * When planner is enabled, consumes immutable toolExecutionPlan (waves + deps).
 * Skipped entirely when AI_TOOL_EXECUTION=false.
 */
export const toolExecutionStage: AiPipelineStage = {
  name: "tool-execution",
  async run(state) {
    if (!isAiToolExecutionEnabled()) {
      return state;
    }

    const plannerEnabled = isAiToolExecutionPlannerEnabled();

    // Planner stage already applied selection/routing + plan-time skips.
    const prepared = plannerEnabled
      ? state.toolExecutions
      : isAiIntelligentToolSelectionEnabled() && state.toolSelectionResult
        ? applyToolSelection(
            state.toolExecutions,
            state.toolSelectionResult.selectedTools,
            true,
          )
        : applyRoutingSelection(
            state.toolExecutions,
            state.toolRoutingDecision?.selectedTools,
            isAiToolRoutingEnabled(),
          );

    const toolExecutions = await executeEligibleTools(prepared, {
      context: {
        userId: state.userId,
        role: state.activeContext.user?.role ?? state.contextHints?.role,
        permissions: state.contextHints?.permissions,
        activeContext: state.activeContext,
        policy: state.policy,
        prompt: state.prompt,
        mode: state.mode ?? state.activeContext.mode,
      },
      plan: plannerEnabled ? state.toolExecutionPlan : undefined,
    });

    return {
      ...state,
      toolExecutions,
    };
  },
};
