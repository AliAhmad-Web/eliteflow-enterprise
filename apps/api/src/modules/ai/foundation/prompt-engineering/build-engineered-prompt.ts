import type { AiAssistModeValue, AiDocumentTypeValue } from "@enterprise/shared";

import type { AiContextSnippet } from "../contracts/ai-active-context.js";
import type { AiEngineeredPrompt } from "../contracts/ai-engineered-prompt.js";
import {
  isAiBusinessContextInjectionEnabled,
  isAiSafeRuntimeMetadataEnabled,
  isAiToolResultInjectionEnabled,
} from "../feature-flags.js";
import type { AiRuntimePipelineState } from "../runtime/pipeline/pipeline-state.js";
import { getSystemInstructions } from "../../providers/provider-prompts.js";
import { formatAgentContextForRuntime } from "../agents/format-agent-context-for-runtime.js";
import { formatAgentPromptStrategyForRuntime } from "../agents/format-agent-prompt-strategy-for-runtime.js";
import { formatAgentDecisionForRuntime } from "../agents/format-agent-decision-for-runtime.js";
import { formatAgentCollaborationForRuntime } from "../agents/format-agent-collaboration-for-runtime.js";
import { formatAgentPermissionsForRuntime } from "../agents/format-agent-permissions-for-runtime.js";
import { formatAgentAnalyticsForRuntime } from "../agents/format-agent-analytics-for-runtime.js";
import { formatSelectedModulesForRuntime } from "../modules/module-runtime.js";
import { formatModuleDataForRuntime } from "../modules/data/format-module-data-for-runtime.js";
import { formatBusinessQueryForRuntime } from "../business-query/business-query-runtime.js";
import { formatBusinessReasoningForRuntime } from "../business-reasoning/business-reasoning-runtime.js";
import { formatBusinessDecisionForRuntime } from "../business-decision/decision-runtime.js";
import { formatBusinessActionForRuntime } from "../business-action/business-action-runtime.js";
import { formatBusinessWorkflowForRuntime } from "../business-workflow/business-workflow-runtime.js";
import { formatBusinessIntelligenceForRuntime } from "../business-intelligence/business-intelligence-runtime.js";
import { formatBusinessRecommendationForRuntime } from "../business-recommendation/business-recommendation-runtime.js";
import { formatBusinessExecutionForRuntime } from "../business-execution/business-execution-runtime.js";
import { formatActionContextForRuntime } from "../action/action-runtime.js";
import { formatActionPlanForRuntime } from "../action/planning/action-plan-runtime.js";
import { formatWorkflowPlanForRuntime } from "../workflow/workflow-runtime.js";
import { formatActionExecutionForRuntime } from "../action/execution/action-execution-runtime.js";
import { formatAutomationExecutionForRuntime } from "../automation/automation-provider-runtime.js";
import { formatMemoryContextForRuntime } from "../memory/memory-runtime.js";
import { formatSemanticKnowledgeForRuntime } from "../memory/semantic/knowledge-runtime.js";
import { formatMemoryPlatformForRuntime } from "../memory/platform/memory-platform-runtime.js";
import { aiDataPolicyService } from "../policy/ai-data-policy.service.js";
import { promptSecurityService } from "../security/index.js";
import { buildRuntimeInstructions } from "./build-runtime-instructions.js";

export interface BuildEngineeredPromptOptions {
  readonly businessSnippets?: readonly AiContextSnippet[];
}

/**
 * Build structured prompt sections from pipeline state.
 * User message is never rewritten. Runtime section may include safe metadata only.
 */
export function buildEngineeredPrompt<TResult>(
  state: AiRuntimePipelineState<TResult>,
  options: BuildEngineeredPromptOptions = {},
): AiEngineeredPrompt {
  const userPrompt = state.prompt ?? "";
  const mode = state.mode ?? "ASK";
  const history = state.providerHistory;

  const systemInstructions = [
    getSystemInstructions({
      mode: mode as AiAssistModeValue | "DOCUMENT",
      prompt: userPrompt,
      documentType: undefined as AiDocumentTypeValue | undefined,
    }),
    // Strategy (5.3) replaces agent system copy when present; else Task 5.1 path.
    state.agentPromptStrategy?.systemInstructions?.trim() ||
      state.activeAgent?.systemInstructions?.trim() ||
      "",
  ]
    .filter((block) => block.length > 0)
    .join("\n\n");

  const businessSnippets =
    isAiBusinessContextInjectionEnabled() && !state.policy.privacyMode
      ? (options.businessSnippets ?? state.activeContext.snippets ?? [])
      : [];

  const policySubject = aiDataPolicyService.subjectFrom({
    userId: state.userId ?? state.activeContext.user?.userId,
    role: state.activeContext.user?.role ?? state.contextHints?.role,
    permissions: state.contextHints?.permissions,
    explicitRestrictedAccess:
      state.contextHints?.explicitRestrictedAccess === true,
  });

  const safeBusinessSnippets = promptSecurityService.sanitizeContextSnippets(
    aiDataPolicyService.sanitizeAIContext(businessSnippets, policySubject),
  );

  const toolResultRuntime =
    isAiToolResultInjectionEnabled() && !state.policy.privacyMode
      ? aiDataPolicyService.sanitizeSummary(
          state.toolResultRuntime?.trim() ?? "",
          policySubject,
        )
      : "";

  // Agent Context (5.2) supplies safe runtime metadata when present.
  // Otherwise preserve Task 5.1 agent runtimeInstructions exactly.
  // Strategy (5.3) appends reasoning/response/format/detail metadata when present.
  // Decision (5.5) appends safe decision metadata when present.
  // Collaboration (5.6) appends safe multi-agent collaboration metadata when present.
  // Permissions (5.7) appends safe security boundary metadata when present.
  // Analytics (5.8) appends safe agent metrics when present.
  // Module Integration (6.1) appends safe relevant module names when present.
  // Module Data Access (6.2) appends safe module count summaries when present.
  // Business Query (6.4) appends safe intent/module/entity/filter metadata when present.
  // Business Reasoning (6.5) appends safe summary/insights/risks/recommendations when present.
  // Business Decision (6.6) appends safe priority/impact/risk/recommendation metadata when present.
  // Business Action (6.7) appends safe action plan/priority/risk/permission metadata when present.
  // Business Workflow (6.8) appends safe workflow/step/transition metadata when present.
  // Business Intelligence (6.9) appends safe health/KPI/trend/forecast metadata when present.
  // Business Recommendation (6.10) appends safe recommendation metadata when present.
  // Business Execution (6.11) appends safe execution plan/timeline metadata when present.
  // Action Framework (8.1) appends safe active action metadata when present.
  // Action Planning (8.2) appends safe action plan metadata when present.
  // Workflow Orchestration (8.2) appends safe workflow plan metadata when present.
  // Action Execution (8.3) appends safe execution status metadata when present.
  // Automation (8.4) appends safe external automation metadata when present.
  // Memory Context (7.1) appends safe runtime memory summaries when present.
  // Semantic Knowledge (7.3) appends Relevant Knowledge / Related Topics / Retrieved Context.
  const agentRuntime = [
    state.agentContext
      ? formatAgentContextForRuntime(state.agentContext)
      : state.activeAgent?.runtimeInstructions?.trim() || "",
    state.agentPromptStrategy
      ? formatAgentPromptStrategyForRuntime(state.agentPromptStrategy)
      : "",
    state.agentDecision
      ? formatAgentDecisionForRuntime(state.agentDecision)
      : "",
    state.agentCollaboration
      ? formatAgentCollaborationForRuntime(state.agentCollaboration)
      : "",
    state.agentPermissions
      ? formatAgentPermissionsForRuntime(state.agentPermissions)
      : "",
    state.agentAnalytics
      ? formatAgentAnalyticsForRuntime(state.agentAnalytics)
      : "",
    state.businessQuery
      ? formatBusinessQueryForRuntime(state.businessQuery)
      : "",
    state.selectedModules
      ? formatSelectedModulesForRuntime(state.selectedModules)
      : "",
    state.moduleData ? formatModuleDataForRuntime(state.moduleData) : "",
    state.businessReasoning
      ? formatBusinessReasoningForRuntime(state.businessReasoning)
      : "",
    state.businessDecision
      ? formatBusinessDecisionForRuntime(state.businessDecision)
      : "",
    state.businessAction
      ? formatBusinessActionForRuntime(state.businessAction)
      : "",
    state.businessWorkflow
      ? formatBusinessWorkflowForRuntime(state.businessWorkflow)
      : "",
    state.businessIntelligence
      ? formatBusinessIntelligenceForRuntime(state.businessIntelligence)
      : "",
    state.businessRecommendation
      ? formatBusinessRecommendationForRuntime(state.businessRecommendation)
      : "",
    state.businessExecution
      ? formatBusinessExecutionForRuntime(state.businessExecution)
      : "",
    state.actionContext
      ? formatActionContextForRuntime(state.actionContext)
      : "",
    state.actionPlan ? formatActionPlanForRuntime(state.actionPlan) : "",
    state.workflowPlan
      ? formatWorkflowPlanForRuntime(state.workflowPlan)
      : "",
    state.actionExecution
      ? formatActionExecutionForRuntime(state.actionExecution)
      : "",
    state.automationExecution
      ? formatAutomationExecutionForRuntime(state.automationExecution)
      : "",
    state.memoryContext
      ? formatMemoryContextForRuntime(state.memoryContext)
      : "",
    state.semanticMemory ||
    state.knowledgeMemory ||
    state.relatedMemories ||
    state.knowledgeGraphSummary
      ? formatSemanticKnowledgeForRuntime({
          semanticMemory: state.semanticMemory,
          knowledgeMemory: state.knowledgeMemory,
          relatedMemories: state.relatedMemories,
          knowledgeGraphSummary: state.knowledgeGraphSummary,
        })
      : "",
    state.memoryPlatform
      ? formatMemoryPlatformForRuntime(state.memoryPlatform)
      : "",
  ]
    .filter((block) => block.length > 0)
    .join("\n\n");

  const runtimeInstructions = isAiSafeRuntimeMetadataEnabled()
    ? [
        buildRuntimeInstructions({
          activeContext: state.activeContext,
          policy: state.policy,
          eligibleTools: state.toolExecutions,
          streaming: state.streaming,
          mode,
          businessSnippets: safeBusinessSnippets,
          toolResultRuntime: toolResultRuntime || undefined,
        }),
        agentRuntime,
      ]
        .filter((block) => block.length > 0)
        .join("\n\n")
    : [
        safeBusinessSnippets.length > 0
          ? [
              "Business context (permission-approved summaries):",
              ...safeBusinessSnippets.map((s) => `- [${s.type}] ${s.text}`),
            ].join("\n")
          : "",
        toolResultRuntime,
        agentRuntime,
      ]
        .filter((block) => block.length > 0)
        .join("\n\n");

  const safeRuntime = aiDataPolicyService.sanitizeSummary(
    runtimeInstructions,
    policySubject,
  );

  return {
    systemInstructions,
    runtimeInstructions: safeRuntime,
    history,
    userPrompt,
    sections: {
      system: systemInstructions,
      runtime: safeRuntime,
      history,
      user: userPrompt,
    },
  };
}
