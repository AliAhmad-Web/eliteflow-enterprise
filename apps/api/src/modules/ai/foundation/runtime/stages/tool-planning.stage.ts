import type { AiPipelineStage } from "./stage.js";
import {
  isAiIntelligentToolSelectionEnabled,
  isAiToolExecutionPlannerEnabled,
  isAiToolRoutingEnabled,
} from "../../feature-flags.js";
import type { AiToolExecution } from "../../contracts/ai-tool-execution.js";
import { buildToolExecutionPlan } from "../../tools/tool-execution-planner.js";
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
 * Apply plan-time skips (circular / unsatisfiable) onto executions.
 */
function applyPlanSkips(
  executions: readonly AiToolExecution[],
  skipReasons: ReadonlyMap<string, string>,
): readonly AiToolExecution[] {
  if (skipReasons.size === 0) return executions;

  return executions.map((execution) => {
    if (execution.status !== "eligible") return execution;
    const reason = skipReasons.get(execution.toolId);
    if (!reason) return execution;
    return {
      ...execution,
      status: "skipped" as const,
      errorMessage: reason,
      error: reason,
      metadata: {
        ...(execution.metadata ?? {}),
        skipReason: reason,
        plannedSkip: true,
      },
    };
  });
}

/**
 * Tool Planning Stage.
 * Builds an immutable dependency-aware execution plan after routing/selection.
 * Skipped when AI_TOOL_EXECUTION_PLANNER=false.
 */
export const toolPlanningStage: AiPipelineStage = {
  name: "tool-planning",
  async run(state) {
    if (!isAiToolExecutionPlannerEnabled()) {
      return {
        ...state,
        toolExecutionPlan: undefined,
      };
    }

    const prepared =
      isAiIntelligentToolSelectionEnabled() && state.toolSelectionResult
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

    const toolExecutionPlan = buildToolExecutionPlan({
      executions: prepared,
    });

    const skipReasons = new Map<string, string>();
    for (const node of toolExecutionPlan.nodes) {
      if (node.skipped && node.skipReason) {
        skipReasons.set(node.toolId, node.skipReason);
      }
    }

    return {
      ...state,
      toolExecutions: applyPlanSkips(prepared, skipReasons),
      toolExecutionPlan,
    };
  },
};
