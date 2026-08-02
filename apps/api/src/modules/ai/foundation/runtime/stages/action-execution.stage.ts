import type { AiPipelineStage } from "./stage.js";
import {
  isAiActionAuditEnabled,
  isAiActionExecutionEnabled,
  isAiActionRetryEnabled,
  isAiActionRollbackEnabled,
} from "../../feature-flags.js";
import { resolveActionExecution } from "../../action/execution/action-execution-engine.js";

/**
 * Action Execution Stage.
 * Executes planned actions through existing services after Workflow
 * Orchestration and before Memory. Never accesses Prisma/repos.
 * Skipped when AI_ACTION_EXECUTION=false (complete no-op).
 */
export const actionExecutionStage: AiPipelineStage = {
  name: "action-execution",
  async run(state) {
    if (!isAiActionExecutionEnabled()) {
      return {
        ...state,
        actionExecution: undefined,
      };
    }

    const actionExecution = await resolveActionExecution({
      actionPlan: state.actionPlan,
      activeAction: state.activeAction,
      actionContext: state.actionContext,
      workflowPlan: state.workflowPlan,
      userId: state.userId,
      activeContext: state.activeContext,
      policy: state.policy,
      permissions: state.contextHints?.permissions,
      role: state.contextHints?.role ?? state.activeContext.user?.role,
      email: state.contextHints?.email ?? state.activeContext.user?.email,
      mode: state.mode ?? state.activeContext.mode,
      prompt: state.prompt,
      enableRetry: isAiActionRetryEnabled(),
      enableRollback: isAiActionRollbackEnabled(),
      enableAudit: isAiActionAuditEnabled(),
    });

    return {
      ...state,
      actionExecution,
    };
  },
};
