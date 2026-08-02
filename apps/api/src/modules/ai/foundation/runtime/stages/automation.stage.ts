import type { AiPipelineStage } from "./stage.js";
import {
  isAiAutomationAuditEnabled,
  isAiAutomationEngineEnabled,
  isAiAutomationTelemetryEnabled,
  isAiExternalWorkflowsEnabled,
  isAiN8nIntegrationEnabled,
} from "../../feature-flags.js";
import { resolveAutomationExecution } from "../../automation/automation-engine.js";

/**
 * Automation Stage.
 * Triggers external automation providers (e.g. n8n) after Action Execution
 * and before Memory. EliteFlow AI remains the brain; providers never own
 * business logic. Skipped when AI_AUTOMATION_ENGINE=false (complete no-op).
 */
export const automationStage: AiPipelineStage = {
  name: "automation",
  async run(state) {
    if (!isAiAutomationEngineEnabled()) {
      return {
        ...state,
        automationExecution: undefined,
      };
    }

    const automationExecution = await resolveAutomationExecution({
      actionPlan: state.actionPlan,
      activeAction: state.activeAction,
      workflowPlan: state.workflowPlan,
      actionExecution: state.actionExecution,
      userId: state.userId,
      activeContext: state.activeContext,
      policy: state.policy,
      enableN8n: isAiN8nIntegrationEnabled(),
      enableExternalWorkflows: isAiExternalWorkflowsEnabled(),
      enableAudit: isAiAutomationAuditEnabled(),
      enableTelemetry: isAiAutomationTelemetryEnabled(),
      enableRetry: isAiN8nIntegrationEnabled(),
    });

    return {
      ...state,
      automationExecution,
    };
  },
};
