/**
 * Internal AI Foundation feature flags.
 * Ops rollback: set AI_FOUNDATION_ORCHESTRATOR=false and restart the API.
 */

function parseEnvFlag(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw.trim() === "") {
    return defaultValue;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return defaultValue;
}

/**
 * When enabled, AiService routes chat / chatStream through the Prompt Orchestrator.
 * Default: enabled.
 */
export function isAiFoundationOrchestratorEnabled(): boolean {
  return parseEnvFlag(process.env.AI_FOUNDATION_ORCHESTRATOR, true);
}

/**
 * When enabled, Prompt Engineering fills Runtime Instructions with safe metadata.
 * Does not rewrite the user message. Default: enabled.
 * Rollback: AI_SAFE_RUNTIME_METADATA=false
 */
export function isAiSafeRuntimeMetadataEnabled(): boolean {
  return parseEnvFlag(process.env.AI_SAFE_RUNTIME_METADATA, true);
}

/**
 * When enabled, permission-approved lightweight business summaries may be
 * appended to Runtime Instructions. Default: enabled (no-op without entity refs).
 * Rollback: AI_BUSINESS_CONTEXT_INJECTION=false
 */
export function isAiBusinessContextInjectionEnabled(): boolean {
  return parseEnvFlag(process.env.AI_BUSINESS_CONTEXT_INJECTION, true);
}

/**
 * When enabled, the Tool Execution stage runs eligible tools (placeholders only).
 * Default: enabled. Does not call external APIs or mutate business data.
 * Rollback: AI_TOOL_EXECUTION=false
 */
export function isAiToolExecutionEnabled(): boolean {
  return parseEnvFlag(process.env.AI_TOOL_EXECUTION, true);
}

/**
 * When enabled, successful tool execution results are injected into Runtime Instructions.
 * Does not rewrite the user message or history. Default: enabled.
 * Rollback: AI_TOOL_RESULT_INJECTION=false
 */
export function isAiToolResultInjectionEnabled(): boolean {
  return parseEnvFlag(process.env.AI_TOOL_RESULT_INJECTION, true);
}

/**
 * When enabled (with AI_TOOL_RESULT_INJECTION), failed tool error summaries may be injected.
 * Default: disabled (successful results only).
 */
export function isAiToolResultInjectionIncludeFailedEnabled(): boolean {
  return parseEnvFlag(process.env.AI_TOOL_RESULT_INJECTION_INCLUDE_FAILED, false);
}

/**
 * When enabled, tools are resolved through the Enterprise Tool Registry + Discovery Engine.
 * When disabled, eligibility uses the static AI_TOOL_CATALOG exactly as before.
 * Default: enabled (behavior identical while all catalog tools are enabled+supported).
 * Rollback: AI_TOOL_DISCOVERY=false
 */
export function isAiToolDiscoveryEnabled(): boolean {
  return parseEnvFlag(process.env.AI_TOOL_DISCOVERY, true);
}

/**
 * When enabled, Tool Routing selects which eligible tools may execute.
 * When disabled, Tool Execution runs all eligible tools (legacy behavior).
 * Default: enabled.
 * Rollback: AI_TOOL_ROUTING=false
 */
export function isAiToolRoutingEnabled(): boolean {
  return parseEnvFlag(process.env.AI_TOOL_ROUTING, true);
}

/**
 * When enabled, Tool Execution uses real enterprise runners (repositories/services).
 * When disabled, placeholder runners are used unchanged.
 * Default: disabled (safe rollback / prior behavior).
 * Rollback: AI_REAL_TOOL_EXECUTION=false
 * Timeout: AI_TOOL_EXECUTION_TIMEOUT_MS (default 10000)
 */
export function isAiRealToolExecutionEnabled(): boolean {
  return parseEnvFlag(process.env.AI_REAL_TOOL_EXECUTION, false);
}

/**
 * When enabled, eligible tools may run concurrently (bounded by AI_MAX_PARALLEL_TOOL_EXECUTIONS).
 * When disabled, tools execute strictly sequentially (legacy behavior).
 * Default: disabled.
 * Rollback: AI_PARALLEL_TOOL_EXECUTION=false
 */
export function isAiParallelToolExecutionEnabled(): boolean {
  return parseEnvFlag(process.env.AI_PARALLEL_TOOL_EXECUTION, false);
}

/**
 * Maximum concurrent tool executions when parallel mode is enabled.
 * Env: AI_MAX_PARALLEL_TOOL_EXECUTIONS (default 4, min 1, max 32).
 */
export function resolveMaxParallelToolExecutions(): number {
  const raw = process.env.AI_MAX_PARALLEL_TOOL_EXECUTIONS?.trim();
  if (!raw) return 4;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 1) return 4;
  return Math.min(value, 32);
}

/**
 * When enabled, builds a dependency-aware execution plan before Tool Execution.
 * When disabled, routing → execution flow is unchanged.
 * Default: disabled.
 * Rollback: AI_TOOL_EXECUTION_PLANNER=false
 */
export function isAiToolExecutionPlannerEnabled(): boolean {
  return parseEnvFlag(process.env.AI_TOOL_EXECUTION_PLANNER, false);
}

/**
 * When enabled, intelligently selects the minimum required tools after routing
 * and before the execution planner.
 * When disabled, routing → planning flow is unchanged.
 * Default: disabled.
 * Rollback: AI_INTELLIGENT_TOOL_SELECTION=false
 */
export function isAiIntelligentToolSelectionEnabled(): boolean {
  return parseEnvFlag(process.env.AI_INTELLIGENT_TOOL_SELECTION, false);
}

/**
 * When enabled, validates/sanitizes tool outputs before Tool Result Injection.
 * When disabled, injection consumes raw toolExecutions exactly as before.
 * Default: disabled.
 * Rollback: AI_TOOL_RESULT_VALIDATION=false
 * Limit: AI_TOOL_RESULT_MAX_OUTPUT_CHARS (default 2000)
 */
export function isAiToolResultValidationEnabled(): boolean {
  return parseEnvFlag(process.env.AI_TOOL_RESULT_VALIDATION, false);
}

/**
 * When enabled, builds immutable tool audit records and attaches toolAuditSummary.
 * Default: disabled.
 * Rollback: AI_TOOL_AUDIT=false
 */
export function isAiToolAuditEnabled(): boolean {
  return parseEnvFlag(process.env.AI_TOOL_AUDIT, false);
}

/**
 * When enabled, emits structured tool observability logs (no console spam).
 * Default: disabled.
 * Rollback: AI_TOOL_OBSERVABILITY=false
 */
export function isAiToolObservabilityEnabled(): boolean {
  return parseEnvFlag(process.env.AI_TOOL_OBSERVABILITY, false);
}

/**
 * When enabled, resolves a specialized AI agent before Prompt Engineering.
 * When disabled, the pipeline behaves exactly as before (no activeAgent).
 * Default: disabled.
 * Rollback: AI_AGENT_FRAMEWORK=false
 */
export function isAiAgentFrameworkEnabled(): boolean {
  return parseEnvFlag(process.env.AI_AGENT_FRAMEWORK, false);
}

/**
 * When enabled, builds immutable Agent Context (capabilities + safe runtime metadata)
 * after Agent Resolution and before Prompt Engineering.
 * When disabled, pipeline behaves exactly as today.
 * Default: disabled.
 * Rollback: AI_AGENT_CONTEXT=false
 */
export function isAiAgentContextEnabled(): boolean {
  return parseEnvFlag(process.env.AI_AGENT_CONTEXT, false);
}

/**
 * When enabled, resolves an Agent Prompt Strategy after Agent Context
 * and before Prompt Engineering.
 * When disabled, Prompt Engineering behaves exactly as today.
 * Default: disabled.
 * Rollback: AI_AGENT_PROMPT_STRATEGY=false
 */
export function isAiAgentPromptStrategyEnabled(): boolean {
  return parseEnvFlag(process.env.AI_AGENT_PROMPT_STRATEGY, false);
}

/**
 * When enabled, resolves an Agent Memory Strategy after Agent Prompt Strategy
 * and Memory Stage consumes it when preparing provider history.
 * When disabled, Memory Stage behaves exactly as today.
 * Default: disabled.
 * Rollback: AI_AGENT_MEMORY_STRATEGY=false
 */
export function isAiAgentMemoryStrategyEnabled(): boolean {
  return parseEnvFlag(process.env.AI_AGENT_MEMORY_STRATEGY, false);
}

/**
 * When enabled, resolves an Agent Decision after Agent Memory Strategy
 * and before Memory / Tool stages. Prompt Engineering may append safe metadata.
 * When disabled, the pipeline behaves exactly as today.
 * Default: disabled.
 * Rollback: AI_AGENT_DECISION_ENGINE=false
 */
export function isAiAgentDecisionEngineEnabled(): boolean {
  return parseEnvFlag(process.env.AI_AGENT_DECISION_ENGINE, false);
}

/**
 * When enabled, resolves multi-agent collaboration metadata after Agent Decision
 * and before Memory. Prompt Engineering may append safe collaboration metadata.
 * When disabled, the pipeline behaves exactly as today.
 * Default: disabled.
 * Rollback: AI_AGENT_COLLABORATION=false
 */
export function isAiAgentCollaborationEnabled(): boolean {
  return parseEnvFlag(process.env.AI_AGENT_COLLABORATION, false);
}

/**
 * When enabled, resolves Agent Permission boundaries after Agent Collaboration
 * and before Memory. Prompt Engineering may append safe security metadata.
 * When disabled, the pipeline behaves exactly as today.
 * Default: disabled.
 * Rollback: AI_AGENT_SECURITY=false
 */
export function isAiAgentSecurityEnabled(): boolean {
  return parseEnvFlag(process.env.AI_AGENT_SECURITY, false);
}

/**
 * When enabled, builds Agent Analytics after Tool Audit and before Prompt Engineering.
 * Emits one structured analytics event and may append safe runtime metrics.
 * When disabled, the pipeline behaves exactly as today.
 * Default: disabled.
 * Rollback: AI_AGENT_ANALYTICS=false
 */
export function isAiAgentAnalyticsEnabled(): boolean {
  return parseEnvFlag(process.env.AI_AGENT_ANALYTICS, false);
}

/**
 * When enabled, resolves relevant Enterprise Modules after Agent stages
 * and before Memory. Prompt Engineering may append safe module names.
 * When disabled, the stage is a complete no-op.
 * Default: disabled.
 * Rollback: AI_MODULE_INTEGRATION=false
 */
export function isAiModuleIntegrationEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MODULE_INTEGRATION, false);
}

/**
 * When enabled, fetches read-only module data summaries after Module Resolution
 * and before Memory. Prompt Engineering may append safe count summaries.
 * When disabled, the stage is a complete no-op.
 * Default: disabled.
 * Rollback: AI_MODULE_DATA_ACCESS=false
 */
export function isAiModuleDataAccessEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MODULE_DATA_ACCESS, false);
}

/**
 * When enabled, Module Data Providers call existing EliteFlow services
 * (safe counts/summaries only). When disabled, providers use placeholder
 * empty responses (no service calls).
 * Default: disabled.
 * Rollback: AI_MODULE_SERVICE_INTEGRATION=false
 */
export function isAiModuleServiceIntegrationEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MODULE_SERVICE_INTEGRATION, false);
}

/**
 * When enabled, builds a structured Business Query after Agent stages
 * and before Module Resolution. Prompt Engineering may append safe metadata.
 * When disabled, the stage is a complete no-op.
 * Default: disabled.
 * Rollback: AI_BUSINESS_QUERY_ENGINE=false
 */
export function isAiBusinessQueryEngineEnabled(): boolean {
  return parseEnvFlag(process.env.AI_BUSINESS_QUERY_ENGINE, false);
}

/**
 * When enabled, analyzes already-fetched moduleData after Module Data
 * and before Memory. Prompt Engineering may append safe reasoning metadata.
 * When disabled, the stage is a complete no-op.
 * Default: disabled.
 * Rollback: AI_BUSINESS_REASONING=false
 */
export function isAiBusinessReasoningEnabled(): boolean {
  return parseEnvFlag(process.env.AI_BUSINESS_REASONING, false);
}

/**
 * When enabled, builds a structured Business Decision after Business Reasoning
 * and before Memory. Prompt Engineering may append safe decision metadata.
 * When disabled, the stage is a complete no-op.
 * Default: disabled.
 * Rollback: AI_BUSINESS_DECISION=false
 */
export function isAiBusinessDecisionEnabled(): boolean {
  return parseEnvFlag(process.env.AI_BUSINESS_DECISION, false);
}

/**
 * When enabled, converts Business Decisions into structured Action Plans
 * after Business Decision and before Memory. Never executes actions.
 * When disabled, the stage is a complete no-op.
 * Default: disabled.
 * Rollback: AI_BUSINESS_ACTION_ENGINE=false
 */
export function isAiBusinessActionEngineEnabled(): boolean {
  return parseEnvFlag(process.env.AI_BUSINESS_ACTION_ENGINE, false);
}

/**
 * When enabled, converts Business Actions into structured Workflows
 * after Business Action and before Memory. Never executes workflows.
 * When disabled, the stage is a complete no-op.
 * Default: disabled.
 * Rollback: AI_BUSINESS_WORKFLOW_ENGINE=false
 */
export function isAiBusinessWorkflowEngineEnabled(): boolean {
  return parseEnvFlag(process.env.AI_BUSINESS_WORKFLOW_ENGINE, false);
}

/**
 * When enabled, builds Business Intelligence from existing runtime signals
 * after Business Workflow and before Memory. Never queries databases.
 * When disabled, the stage is a complete no-op.
 * Default: disabled.
 * Rollback: AI_BUSINESS_INTELLIGENCE=false
 */
export function isAiBusinessIntelligenceEnabled(): boolean {
  return parseEnvFlag(process.env.AI_BUSINESS_INTELLIGENCE, false);
}

/**
 * When enabled, generates structured Business Recommendations from Business
 * Intelligence after BI and before Memory. Never executes actions.
 * When disabled, the stage is a complete no-op.
 * Default: disabled.
 * Rollback: AI_BUSINESS_RECOMMENDATION=false
 */
export function isAiBusinessRecommendationEnabled(): boolean {
  return parseEnvFlag(process.env.AI_BUSINESS_RECOMMENDATION, false);
}

/**
 * When enabled, builds structured Business Execution plans from Business
 * Recommendations after Recommendation and before Memory. Never executes.
 * When disabled, the stage is a complete no-op.
 * Default: disabled.
 * Rollback: AI_BUSINESS_EXECUTION=false
 */
export function isAiBusinessExecutionEnabled(): boolean {
  return parseEnvFlag(process.env.AI_BUSINESS_EXECUTION, false);
}

/**
 * Master switch for the Enterprise AI Action Framework.
 * When enabled, resolves the active enterprise action after Business Execution
 * and before Memory / Tool Registry. Never executes actions or calls services.
 * When disabled, the stage is a complete no-op.
 * Default: disabled.
 * Rollback: AI_ACTION_FRAMEWORK=false
 */
export function isAiActionFrameworkEnabled(): boolean {
  return parseEnvFlag(process.env.AI_ACTION_FRAMEWORK, false);
}

/**
 * When enabled, builds immutable Action Plans after Action Resolution and
 * before Workflow Orchestration / Memory. Never executes actions or tools.
 * When disabled, the stage is a complete no-op.
 * Default: disabled.
 * Rollback: AI_ACTION_PLANNING=false
 */
export function isAiActionPlanningEnabled(): boolean {
  return parseEnvFlag(process.env.AI_ACTION_PLANNING, false);
}

/**
 * When enabled, builds immutable enterprise Workflow Plans after Action
 * Planning and before Memory. Never executes workflows, actions, or tools.
 * When disabled, the stage is a complete no-op.
 * Default: disabled.
 * Rollback: AI_WORKFLOW_ORCHESTRATION=false
 */
export function isAiWorkflowOrchestrationEnabled(): boolean {
  return parseEnvFlag(process.env.AI_WORKFLOW_ORCHESTRATION, false);
}

/**
 * Master switch for Enterprise AI Action Execution.
 * When enabled, executes planned actions through existing services after
 * Workflow Orchestration and before Memory. Never accesses Prisma/repos.
 * When disabled, the stage is a complete no-op.
 * Default: disabled.
 * Rollback: AI_ACTION_EXECUTION=false
 */
export function isAiActionExecutionEnabled(): boolean {
  return parseEnvFlag(process.env.AI_ACTION_EXECUTION, false);
}

/**
 * When enabled, retries retryable service failures during Action Execution.
 * Complete no-op when AI_ACTION_EXECUTION is false.
 * Default: disabled.
 * Rollback: AI_ACTION_RETRY=false
 */
export function isAiActionRetryEnabled(): boolean {
  return parseEnvFlag(process.env.AI_ACTION_RETRY, false);
}

/**
 * When enabled, applies transactional rollback metadata after failed
 * multi-step Action Execution. Never bypasses services.
 * Default: disabled.
 * Rollback: AI_ACTION_ROLLBACK=false
 */
export function isAiActionRollbackEnabled(): boolean {
  return parseEnvFlag(process.env.AI_ACTION_ROLLBACK, false);
}

/**
 * When enabled, records SAFE Action Execution audit events.
 * Never includes raw records, tokens, or secrets.
 * Default: disabled.
 * Rollback: AI_ACTION_AUDIT=false
 */
export function isAiActionAuditEnabled(): boolean {
  return parseEnvFlag(process.env.AI_ACTION_AUDIT, false);
}

/**
 * Master switch for Enterprise Automation Engine (external providers).
 * When enabled, runs after Action Execution and before Memory.
 * EliteFlow AI remains the brain; providers never own business logic.
 * When disabled, the stage is a complete no-op.
 * Default: disabled.
 * Rollback: AI_AUTOMATION_ENGINE=false
 */
export function isAiAutomationEngineEnabled(): boolean {
  return parseEnvFlag(process.env.AI_AUTOMATION_ENGINE, false);
}

/**
 * When enabled, allows the built-in n8n automation provider.
 * Complete no-op when AI_AUTOMATION_ENGINE is false.
 * Default: disabled. No live n8n instance required.
 * Rollback: AI_N8N_INTEGRATION=false
 */
export function isAiN8nIntegrationEnabled(): boolean {
  return parseEnvFlag(process.env.AI_N8N_INTEGRATION, false);
}

/**
 * When enabled, allows dispatching to external workflow providers.
 * Complete no-op when AI_AUTOMATION_ENGINE is false.
 * Default: disabled.
 * Rollback: AI_EXTERNAL_WORKFLOWS=false
 */
export function isAiExternalWorkflowsEnabled(): boolean {
  return parseEnvFlag(process.env.AI_EXTERNAL_WORKFLOWS, false);
}

/**
 * When enabled, records SAFE automation audit events.
 * Default: disabled.
 * Rollback: AI_AUTOMATION_AUDIT=false
 */
export function isAiAutomationAuditEnabled(): boolean {
  return parseEnvFlag(process.env.AI_AUTOMATION_AUDIT, false);
}

/**
 * When enabled, records SAFE automation telemetry metrics.
 * Default: disabled.
 * Rollback: AI_AUTOMATION_TELEMETRY=false
 */
export function isAiAutomationTelemetryEnabled(): boolean {
  return parseEnvFlag(process.env.AI_AUTOMATION_TELEMETRY, false);
}

/**
 * Master switch for the Enterprise AI Memory Framework (runtime-only).
 * When disabled, all memory retrieval/ranking/context stages are no-ops.
 * Legacy Memory Stage continues to work independently.
 * Default: disabled.
 * Rollback: AI_MEMORY_FRAMEWORK=false
 */
export function isAiMemoryFrameworkEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_FRAMEWORK, false);
}

/**
 * When enabled, retrieves runtime-only memory entries after Business Execution.
 * Never persists. Never accesses database. Complete no-op when disabled.
 * Default: disabled.
 * Rollback: AI_MEMORY_RETRIEVAL=false
 */
export function isAiMemoryRetrievalEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_RETRIEVAL, false);
}

/**
 * When enabled, ranks retrieved memory entries before Memory Context.
 * Complete no-op when disabled.
 * Default: disabled.
 * Rollback: AI_MEMORY_RANKING=false
 */
export function isAiMemoryRankingEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_RANKING, false);
}

/**
 * When enabled, builds immutable memory context for Prompt Engineering.
 * Appends SAFE summaries only. Complete no-op when disabled.
 * Default: disabled.
 * Rollback: AI_MEMORY_CONTEXT=false
 */
export function isAiMemoryContextEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_CONTEXT, false);
}

/**
 * Master switch for persistent Enterprise AI Memory.
 * When disabled, load/save/cache/search stages are no-ops and Task 7.1
 * runtime-only memory behavior is preserved exactly.
 * Default: disabled.
 * Rollback: AI_PERSISTENT_MEMORY=false
 */
export function isAiPersistentMemoryEnabled(): boolean {
  return parseEnvFlag(process.env.AI_PERSISTENT_MEMORY, false);
}

/**
 * When enabled, lazy-loads persistent memory before Context Stage.
 * Complete no-op when disabled.
 * Default: disabled.
 * Rollback: AI_MEMORY_LOAD=false
 */
export function isAiMemoryLoadEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_LOAD, false);
}

/**
 * When enabled, persists memory after Response Stage (batched/background).
 * Complete no-op when disabled.
 * Default: disabled.
 * Rollback: AI_MEMORY_SAVE=false
 */
export function isAiMemorySaveEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_SAVE, false);
}

/**
 * When enabled, uses the in-process memory cache on load.
 * Default: disabled.
 * Rollback: AI_MEMORY_CACHE=false
 */
export function isAiMemoryCacheEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_CACHE, false);
}

/**
 * When enabled, applies keyword/type search when loading persistent memory.
 * Default: disabled.
 * Rollback: AI_MEMORY_SEARCH=false
 */
export function isAiMemorySearchEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_SEARCH, false);
}

/**
 * Master switch for semantic memory / knowledge retrieval.
 * When disabled, semantic and knowledge stages are complete no-ops.
 * Default: disabled.
 * Rollback: AI_SEMANTIC_MEMORY=false
 */
export function isAiSemanticMemoryEnabled(): boolean {
  return parseEnvFlag(process.env.AI_SEMANTIC_MEMORY, false);
}

/**
 * When enabled, builds local/abstract embeddings for memory entries.
 * Default: disabled.
 * Rollback: AI_MEMORY_EMBEDDINGS=false
 */
export function isAiMemoryEmbeddingsEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_EMBEDDINGS, false);
}

/**
 * When enabled, runs similarity search over embedded memories.
 * Default: disabled.
 * Rollback: AI_MEMORY_SIMILARITY_SEARCH=false
 */
export function isAiMemorySimilaritySearchEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_SIMILARITY_SEARCH, false);
}

/**
 * When enabled, builds memory relationship links.
 * Default: disabled.
 * Rollback: AI_MEMORY_RELATIONSHIPS=false
 */
export function isAiMemoryRelationshipsEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_RELATIONSHIPS, false);
}

/**
 * When enabled, builds a runtime knowledge graph summary.
 * Default: disabled.
 * Rollback: AI_MEMORY_KNOWLEDGE_GRAPH=false
 */
export function isAiMemoryKnowledgeGraphEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_KNOWLEDGE_GRAPH, false);
}

/**
 * Master switch for long-term memory intelligence.
 * When disabled, long-term and consolidation stages are complete no-ops.
 * Default: disabled.
 * Rollback: AI_LONG_TERM_MEMORY=false
 */
export function isAiLongTermMemoryEnabled(): boolean {
  return parseEnvFlag(process.env.AI_LONG_TERM_MEMORY, false);
}

/**
 * When enabled, consolidates / merges / archives memories after long-term scoring.
 * Default: disabled.
 * Rollback: AI_MEMORY_CONSOLIDATION=false
 */
export function isAiMemoryConsolidationEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_CONSOLIDATION, false);
}

/**
 * When enabled, applies retention policies during long-term evaluation.
 * Default: disabled.
 * Rollback: AI_MEMORY_RETENTION=false
 */
export function isAiMemoryRetentionEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_RETENTION, false);
}

/**
 * When enabled, applies forgetting rules to low-value memories.
 * Default: disabled.
 * Rollback: AI_MEMORY_FORGETTING=false
 */
export function isAiMemoryForgettingEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_FORGETTING, false);
}

/**
 * When enabled, applies aging decay to memory strength/relevance.
 * Default: disabled.
 * Rollback: AI_MEMORY_AGING=false
 */
export function isAiMemoryAgingEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_AGING, false);
}

/**
 * When enabled, maintains active working/session reasoning memory.
 * Default: disabled.
 * Rollback: AI_WORKING_MEMORY=false
 */
export function isAiWorkingMemoryEnabled(): boolean {
  return parseEnvFlag(process.env.AI_WORKING_MEMORY, false);
}

/**
 * When enabled, builds episodic conversation/business event memory.
 * Default: disabled.
 * Rollback: AI_EPISODIC_MEMORY=false
 */
export function isAiEpisodicMemoryEnabled(): boolean {
  return parseEnvFlag(process.env.AI_EPISODIC_MEMORY, false);
}

/**
 * When enabled, constructs conversation/business episodes within episodic memory.
 * Default: disabled.
 * Rollback: AI_MEMORY_EPISODES=false
 */
export function isAiMemoryEpisodesEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_EPISODES, false);
}

/**
 * When enabled, attaches session context isolation to working memory.
 * Default: disabled.
 * Rollback: AI_MEMORY_SESSION_CONTEXT=false
 */
export function isAiMemorySessionContextEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_SESSION_CONTEXT, false);
}

/**
 * Master switch for the unified Enterprise Memory Platform orchestrator.
 * Default: disabled.
 * Rollback: AI_MEMORY_ORCHESTRATOR=false
 */
export function isAiMemoryOrchestratorEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_ORCHESTRATOR, false);
}

/**
 * When enabled, runs memory optimization / cache / retrieval refinements.
 * Default: disabled.
 * Rollback: AI_MEMORY_OPTIMIZATION=false
 */
export function isAiMemoryOptimizationEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_OPTIMIZATION, false);
}

/**
 * When enabled, collects memory analytics metrics.
 * Default: disabled.
 * Rollback: AI_MEMORY_ANALYTICS=false
 */
export function isAiMemoryAnalyticsEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_ANALYTICS, false);
}

/**
 * When enabled, emits memory monitoring / telemetry signals.
 * Default: disabled.
 * Rollback: AI_MEMORY_MONITORING=false
 */
export function isAiMemoryMonitoringEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_MONITORING, false);
}

/**
 * When enabled, computes memory health scoring.
 * Default: disabled.
 * Rollback: AI_MEMORY_HEALTH=false
 */
export function isAiMemoryHealthEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_HEALTH, false);
}

/**
 * When enabled, runs memory diagnostics / integrity checks.
 * Default: disabled.
 * Rollback: AI_MEMORY_DIAGNOSTICS=false
 */
export function isAiMemoryDiagnosticsEnabled(): boolean {
  return parseEnvFlag(process.env.AI_MEMORY_DIAGNOSTICS, false);
}

/**
 * When enabled, every AI provider call is budget-aware (validate → estimate → record).
 * Default: enabled. Rollback: AI_BUDGET_ENABLED=false
 */
export function isAiBudgetFeatureEnabled(): boolean {
  return parseEnvFlag(process.env.AI_BUDGET_ENABLED, true);
}
