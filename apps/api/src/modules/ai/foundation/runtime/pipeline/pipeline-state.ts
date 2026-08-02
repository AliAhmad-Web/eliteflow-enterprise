import type { AiActiveContext } from "../../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../../contracts/ai-effective-policy.js";
import type { AiEngineeredPrompt } from "../../contracts/ai-engineered-prompt.js";
import type { AiFoundationRequest } from "../../contracts/ai-foundation-request.js";
import type { AiFoundationResponse } from "../../contracts/ai-foundation-response.js";
import type { AiMemoryMessage } from "../../contracts/ai-memory-message.js";
import type { AiProviderRequest } from "../../contracts/ai-provider-request.js";
import type { AiResolvedProviderBinding } from "../../contracts/ai-resolved-provider-binding.js";
import type { AiToolExecution } from "../../contracts/ai-tool-execution.js";
import type { AiContextHints } from "../../context/resolve-active-context.js";
import type { AiPolicyOverrides } from "../../settings/settings-enforcer.js";
import type { AiToolDefinition } from "../../tools/tool-catalog.js";
import type { AiToolRegistration } from "../../tools/tool-registry.js";
import type { AiToolRoutingDecision } from "../../tools/tool-routing-engine.js";
import type { AiToolExecutionPlan } from "../../tools/tool-execution-planner.js";
import type { AiToolSelectionResult } from "../../tools/tool-selection-engine.js";
import type { AiValidatedToolResults } from "../../tools/tool-result-validation.js";
import type { AiToolAuditSummary } from "../../tools/tool-audit-engine.js";
import type { AiActiveAgent } from "../../agents/ai-agent.js";
import type { AiAgentContext } from "../../agents/ai-agent-context.js";
import type { AiAgentPromptStrategy } from "../../agents/ai-agent-prompt-strategy.js";
import type { AiAgentMemoryStrategy } from "../../agents/ai-agent-memory-strategy.js";
import type { AiAgentDecision } from "../../agents/ai-agent-decision.js";
import type { AiAgentCollaboration } from "../../agents/ai-agent-collaboration.js";
import type { AiAgentPermissions } from "../../agents/ai-agent-permissions.js";
import type { AiAgentAnalytics } from "../../agents/ai-agent-analytics.js";
import type { AiSelectedModules } from "../../modules/module-resolver.js";
import type { AiModuleDataBundle } from "../../modules/data/module-data-response.js";
import type { AiBusinessQuery } from "../../business-query/business-query.js";
import type { AiBusinessReasoning } from "../../business-reasoning/business-reasoning.js";
import type { AiBusinessDecision } from "../../business-decision/business-decision.js";
import type { AiBusinessAction } from "../../business-action/business-action.js";
import type { AiBusinessWorkflow } from "../../business-workflow/business-workflow.js";
import type { AiBusinessIntelligence } from "../../business-intelligence/business-intelligence.js";
import type { AiBusinessRecommendation } from "../../business-recommendation/business-recommendation.js";
import type { AiBusinessExecution } from "../../business-execution/business-execution.js";
import type { AiActiveAction } from "../../action/ai-action.js";
import type { AiActionContext } from "../../action/action-context.js";
import type { AiActionPlan } from "../../action/planning/ai-action-plan.js";
import type { AiWorkflowPlan } from "../../workflow/workflow-instance.js";
import type { AiActionExecution } from "../../action/execution/ai-action-execution.js";
import type { AiAutomationExecution } from "../../automation/automation-engine.js";
import type { AiMemoryEntry } from "../../memory/memory-entry.js";
import type { AiMemoryRanking } from "../../memory/memory-ranking.js";
import type { AiMemoryContext } from "../../memory/memory-context.js";
import type {
  AiLoadedMemory,
  AiMemoryPersistenceState,
} from "../../memory/persistence/memory-loader.js";
import type { AiSavedMemory } from "../../memory/persistence/memory-saver.js";
import type { AiSemanticMemory } from "../../memory/semantic/semantic-memory.js";
import type {
  AiKnowledgeGraphSummary,
  AiKnowledgeMemory,
} from "../../memory/semantic/knowledge-graph.js";
import type { AiLongTermMemory } from "../../memory/long-term/long-term-memory.js";
import type { AiMemoryConsolidation } from "../../memory/long-term/long-term-memory-consolidation.js";
import type { AiWorkingMemory } from "../../memory/working/working-memory.js";
import type { AiEpisodicMemory } from "../../memory/episodic/episodic-memory.js";
import type { AiMemoryOrchestration } from "../../memory/platform/memory-orchestrator.js";
import type { AiMemoryPlatform } from "../../memory/platform/memory-platform.js";

export interface AiRuntimePipelineState<TResult = unknown> {
  readonly execute: (
    state: AiRuntimePipelineState<TResult>,
  ) => Promise<TResult>;
  readonly userId?: string | null;
  readonly policyOverrides?: AiPolicyOverrides | null;
  readonly contextHints?: AiContextHints | null;
  readonly prompt?: string;
  readonly mode?: string;
  readonly streaming?: boolean;
  readonly foundationRequest?: AiFoundationRequest;
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  readonly providerBinding?: AiResolvedProviderBinding;
  readonly conversationHistory: readonly AiMemoryMessage[];
  readonly providerHistory: readonly AiMemoryMessage[];
  /** Immutable loaded persistent memory (when AI_MEMORY_LOAD is enabled). */
  readonly loadedMemory?: AiLoadedMemory;
  /** Immutable persistence metadata (when AI_MEMORY_LOAD is enabled). */
  readonly memoryPersistence?: AiMemoryPersistenceState;
  /** Immutable save result (when AI_MEMORY_SAVE is enabled). */
  readonly savedMemory?: AiSavedMemory;
  /** Immutable registry snapshot from Tool Registry Stage. */
  readonly toolRegistrations?: readonly AiToolRegistration[];
  /** Immutable discovered definitions from Tool Discovery Stage. */
  readonly discoveredTools?: readonly AiToolDefinition[];
  readonly toolExecutions: readonly AiToolExecution[];
  /** Selection from Tool Routing Stage (when AI_TOOL_ROUTING is enabled). */
  readonly toolRoutingDecision?: AiToolRoutingDecision;
  /** Intelligent minimum-tool selection (when AI_INTELLIGENT_TOOL_SELECTION is enabled). */
  readonly toolSelectionResult?: AiToolSelectionResult;
  /** Immutable plan from Tool Planning Stage (when AI_TOOL_EXECUTION_PLANNER is enabled). */
  readonly toolExecutionPlan?: AiToolExecutionPlan;
  /** Validated/sanitized tool outputs (when AI_TOOL_RESULT_VALIDATION is enabled). */
  readonly validatedToolResults?: AiValidatedToolResults;
  /** Immutable tool audit summary (when AI_TOOL_AUDIT is enabled). */
  readonly toolAuditSummary?: AiToolAuditSummary;
  /** Resolved specialized agent (when AI_AGENT_FRAMEWORK is enabled). */
  readonly activeAgent?: AiActiveAgent;
  /** Immutable agent capabilities/context (when AI_AGENT_CONTEXT is enabled). */
  readonly agentContext?: AiAgentContext;
  /** Immutable agent prompt strategy (when AI_AGENT_PROMPT_STRATEGY is enabled). */
  readonly agentPromptStrategy?: AiAgentPromptStrategy;
  /** Immutable agent memory strategy (when AI_AGENT_MEMORY_STRATEGY is enabled). */
  readonly agentMemoryStrategy?: AiAgentMemoryStrategy;
  /** Immutable agent decision (when AI_AGENT_DECISION_ENGINE is enabled). */
  readonly agentDecision?: AiAgentDecision;
  /** Immutable multi-agent collaboration (when AI_AGENT_COLLABORATION is enabled). */
  readonly agentCollaboration?: AiAgentCollaboration;
  /** Immutable agent permission boundaries (when AI_AGENT_SECURITY is enabled). */
  readonly agentPermissions?: AiAgentPermissions;
  /** Immutable agent analytics (when AI_AGENT_ANALYTICS is enabled). */
  readonly agentAnalytics?: AiAgentAnalytics;
  /** Immutable structured business query (when AI_BUSINESS_QUERY_ENGINE is enabled). */
  readonly businessQuery?: AiBusinessQuery;
  /** Immutable selected enterprise modules (when AI_MODULE_INTEGRATION is enabled). */
  readonly selectedModules?: AiSelectedModules;
  /** Immutable read-only module data summaries (when AI_MODULE_DATA_ACCESS is enabled). */
  readonly moduleData?: AiModuleDataBundle;
  /** Immutable business reasoning over moduleData (when AI_BUSINESS_REASONING is enabled). */
  readonly businessReasoning?: AiBusinessReasoning;
  /** Immutable business decision from reasoning (when AI_BUSINESS_DECISION is enabled). */
  readonly businessDecision?: AiBusinessDecision;
  /** Immutable business action plan from decision (when AI_BUSINESS_ACTION_ENGINE is enabled). */
  readonly businessAction?: AiBusinessAction;
  /** Immutable business workflow from action (when AI_BUSINESS_WORKFLOW_ENGINE is enabled). */
  readonly businessWorkflow?: AiBusinessWorkflow;
  /** Immutable business intelligence from runtime signals (when AI_BUSINESS_INTELLIGENCE is enabled). */
  readonly businessIntelligence?: AiBusinessIntelligence;
  /** Immutable business recommendations from BI (when AI_BUSINESS_RECOMMENDATION is enabled). */
  readonly businessRecommendation?: AiBusinessRecommendation;
  /** Immutable business execution plan (when AI_BUSINESS_EXECUTION is enabled). */
  readonly businessExecution?: AiBusinessExecution;
  /** Resolved enterprise action (when AI_ACTION_FRAMEWORK is enabled). */
  readonly activeAction?: AiActiveAction;
  /** Immutable action context (when AI_ACTION_FRAMEWORK is enabled). */
  readonly actionContext?: AiActionContext;
  /** Immutable action plan (when AI_ACTION_PLANNING is enabled). */
  readonly actionPlan?: AiActionPlan;
  /** Immutable workflow plan (when AI_WORKFLOW_ORCHESTRATION is enabled). */
  readonly workflowPlan?: AiWorkflowPlan;
  /** Immutable action execution result (when AI_ACTION_EXECUTION is enabled). */
  readonly actionExecution?: AiActionExecution;
  /** Immutable automation execution (when AI_AUTOMATION_ENGINE is enabled). */
  readonly automationExecution?: AiAutomationExecution;
  /** Immutable retrieved runtime memory entries (when AI_MEMORY_RETRIEVAL is enabled). */
  readonly memoryEntries?: readonly AiMemoryEntry[];
  /** Immutable memory ranking result (when AI_MEMORY_RANKING is enabled). */
  readonly memoryRanking?: AiMemoryRanking;
  /** Immutable semantic memory snapshot (when AI_SEMANTIC_MEMORY is enabled). */
  readonly semanticMemory?: AiSemanticMemory;
  /** Immutable knowledge memory / graph (when AI_MEMORY_KNOWLEDGE_GRAPH is enabled). */
  readonly knowledgeMemory?: AiKnowledgeMemory;
  /** Immutable related memories from semantic linking. */
  readonly relatedMemories?: readonly AiMemoryEntry[];
  /** Immutable knowledge graph summary for Prompt Engineering. */
  readonly knowledgeGraphSummary?: AiKnowledgeGraphSummary;
  /** Immutable long-term memory intelligence (when AI_LONG_TERM_MEMORY is enabled). */
  readonly longTermMemory?: AiLongTermMemory;
  /** Immutable consolidation result (when AI_MEMORY_CONSOLIDATION is enabled). */
  readonly memoryConsolidation?: AiMemoryConsolidation;
  /** Immutable working memory (when AI_WORKING_MEMORY is enabled). */
  readonly workingMemory?: AiWorkingMemory;
  /** Immutable episodic memory (when AI_EPISODIC_MEMORY is enabled). */
  readonly episodicMemory?: AiEpisodicMemory;
  /** Immutable memory orchestration plan (when AI_MEMORY_ORCHESTRATOR is enabled). */
  readonly memoryOrchestration?: AiMemoryOrchestration;
  /** Immutable enterprise memory platform snapshot (when AI_MEMORY_ORCHESTRATOR is enabled). */
  readonly memoryPlatform?: AiMemoryPlatform;
  /** Immutable memory context for Prompt Engineering (when AI_MEMORY_CONTEXT is enabled). */
  readonly memoryContext?: AiMemoryContext;
  /**
   * Structured tool-result runtime metadata from Tool Result Injection Stage.
   * Consumed by Prompt Engineering; never alters user prompt or history.
   */
  readonly toolResultRuntime?: string;
  /** Set by Prompt Engineering Stage. */
  readonly engineeredPrompt?: AiEngineeredPrompt;
  readonly providerRequest?: AiProviderRequest;
  readonly result?: TResult;
  readonly foundationResponse?: AiFoundationResponse;
}
