import type { AiPipelineStage } from "./stage.js";
import {
  isAiToolAuditEnabled,
  isAiToolObservabilityEnabled,
} from "../../feature-flags.js";
import {
  buildToolAuditSummary,
  emitToolObservabilityLog,
} from "../../tools/tool-audit-engine.js";

/**
 * Tool Audit & Observability Stage.
 * Builds immutable audit summary and/or emits structured observability logs.
 * When both flags are disabled, this stage is a pure no-op.
 * Failures never interrupt the pipeline.
 */
export const toolAuditStage: AiPipelineStage = {
  name: "tool-audit",
  async run(state) {
    const auditEnabled = isAiToolAuditEnabled();
    const observabilityEnabled = isAiToolObservabilityEnabled();

    if (!auditEnabled && !observabilityEnabled) {
      return {
        ...state,
        toolAuditSummary: undefined,
      };
    }

    try {
      const toolAuditSummary = buildToolAuditSummary({
        activeContext: state.activeContext,
        policy: state.policy,
        userId: state.userId,
        discoveredTools: state.discoveredTools,
        toolExecutions: state.toolExecutions,
        toolRoutingDecision: state.toolRoutingDecision,
        toolSelectionResult: state.toolSelectionResult,
        toolExecutionPlan: state.toolExecutionPlan,
        validatedToolResults: state.validatedToolResults,
      });

      if (observabilityEnabled) {
        emitToolObservabilityLog(toolAuditSummary);
      }

      if (auditEnabled) {
        return {
          ...state,
          toolAuditSummary,
        };
      }

      return {
        ...state,
        toolAuditSummary: undefined,
      };
    } catch {
      // Audit / observability failures must never interrupt the AI pipeline.
      return {
        ...state,
        toolAuditSummary: undefined,
      };
    }
  },
};
