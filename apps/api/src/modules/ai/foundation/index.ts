export { isAiFoundationOrchestratorEnabled } from "./feature-flags.js";
export { isAiSafeRuntimeMetadataEnabled } from "./feature-flags.js";
export { isAiBusinessContextInjectionEnabled } from "./feature-flags.js";
export { isAiToolExecutionEnabled } from "./feature-flags.js";
export { isAiToolResultInjectionEnabled } from "./feature-flags.js";
export { isAiToolResultInjectionIncludeFailedEnabled } from "./feature-flags.js";
export { isAiToolDiscoveryEnabled } from "./feature-flags.js";
export { isAiToolRoutingEnabled } from "./feature-flags.js";
export { isAiRealToolExecutionEnabled } from "./feature-flags.js";
export { isAiParallelToolExecutionEnabled } from "./feature-flags.js";
export { resolveMaxParallelToolExecutions } from "./feature-flags.js";
export { isAiToolExecutionPlannerEnabled } from "./feature-flags.js";
export { isAiIntelligentToolSelectionEnabled } from "./feature-flags.js";
export { isAiToolResultValidationEnabled } from "./feature-flags.js";
export { isAiToolAuditEnabled } from "./feature-flags.js";
export { isAiToolObservabilityEnabled } from "./feature-flags.js";
export { isAiAgentFrameworkEnabled } from "./feature-flags.js";
export { isAiAgentContextEnabled } from "./feature-flags.js";
export { isAiAgentPromptStrategyEnabled } from "./feature-flags.js";
export { isAiAgentMemoryStrategyEnabled } from "./feature-flags.js";
export { isAiAgentDecisionEngineEnabled } from "./feature-flags.js";
export { isAiAgentCollaborationEnabled } from "./feature-flags.js";
export { isAiAgentSecurityEnabled } from "./feature-flags.js";
export { isAiAgentAnalyticsEnabled } from "./feature-flags.js";
export { isAiModuleIntegrationEnabled } from "./feature-flags.js";
export { isAiModuleDataAccessEnabled } from "./feature-flags.js";
export { isAiModuleServiceIntegrationEnabled } from "./feature-flags.js";
export { isAiBusinessQueryEngineEnabled } from "./feature-flags.js";
export { isAiBusinessReasoningEnabled } from "./feature-flags.js";
export { isAiBusinessDecisionEnabled } from "./feature-flags.js";
export { isAiBusinessActionEngineEnabled } from "./feature-flags.js";
export { isAiBusinessWorkflowEngineEnabled } from "./feature-flags.js";
export { isAiBusinessIntelligenceEnabled } from "./feature-flags.js";
export { isAiBusinessRecommendationEnabled } from "./feature-flags.js";
export { isAiBusinessExecutionEnabled } from "./feature-flags.js";
export { isAiActionFrameworkEnabled } from "./feature-flags.js";
export { isAiActionPlanningEnabled } from "./feature-flags.js";
export { isAiWorkflowOrchestrationEnabled } from "./feature-flags.js";
export { isAiActionExecutionEnabled } from "./feature-flags.js";
export { isAiActionRetryEnabled } from "./feature-flags.js";
export { isAiActionRollbackEnabled } from "./feature-flags.js";
export { isAiActionAuditEnabled } from "./feature-flags.js";
export { isAiAutomationEngineEnabled } from "./feature-flags.js";
export { isAiN8nIntegrationEnabled } from "./feature-flags.js";
export { isAiExternalWorkflowsEnabled } from "./feature-flags.js";
export { isAiAutomationAuditEnabled } from "./feature-flags.js";
export { isAiAutomationTelemetryEnabled } from "./feature-flags.js";
export { isAiMemoryFrameworkEnabled } from "./feature-flags.js";
export { isAiMemoryRetrievalEnabled } from "./feature-flags.js";
export { isAiMemoryRankingEnabled } from "./feature-flags.js";
export { isAiMemoryContextEnabled } from "./feature-flags.js";
export { isAiPersistentMemoryEnabled } from "./feature-flags.js";
export { isAiMemoryLoadEnabled } from "./feature-flags.js";
export { isAiMemorySaveEnabled } from "./feature-flags.js";
export { isAiMemoryCacheEnabled } from "./feature-flags.js";
export { isAiMemorySearchEnabled } from "./feature-flags.js";
export { isAiSemanticMemoryEnabled } from "./feature-flags.js";
export { isAiMemoryEmbeddingsEnabled } from "./feature-flags.js";
export { isAiMemorySimilaritySearchEnabled } from "./feature-flags.js";
export { isAiMemoryRelationshipsEnabled } from "./feature-flags.js";
export { isAiMemoryKnowledgeGraphEnabled } from "./feature-flags.js";
export { isAiLongTermMemoryEnabled } from "./feature-flags.js";
export { isAiMemoryConsolidationEnabled } from "./feature-flags.js";
export { isAiMemoryRetentionEnabled } from "./feature-flags.js";
export { isAiMemoryForgettingEnabled } from "./feature-flags.js";
export { isAiMemoryAgingEnabled } from "./feature-flags.js";
export { isAiWorkingMemoryEnabled } from "./feature-flags.js";
export { isAiEpisodicMemoryEnabled } from "./feature-flags.js";
export { isAiMemoryEpisodesEnabled } from "./feature-flags.js";
export { isAiMemorySessionContextEnabled } from "./feature-flags.js";
export { isAiMemoryOrchestratorEnabled } from "./feature-flags.js";
export { isAiMemoryOptimizationEnabled } from "./feature-flags.js";
export { isAiMemoryAnalyticsEnabled } from "./feature-flags.js";
export { isAiMemoryMonitoringEnabled } from "./feature-flags.js";
export { isAiMemoryHealthEnabled } from "./feature-flags.js";
export { isAiMemoryDiagnosticsEnabled } from "./feature-flags.js";
export {
  PromptOrchestrator,
  promptOrchestrator,
} from "./prompt-orchestrator.js";
export type { AiOrchestratorRunOptions } from "./prompt-orchestrator.js";
export type {
  AiActiveContext,
  AiContextEntityRef,
  AiContextIdentity,
  AiContextOrganization,
  AiContextSnippet,
  AiEffectivePolicy,
  AiExecutionContext,
  AiFinishReason,
  AiFoundationAttachment,
  AiFoundationRequest,
  AiFoundationRequestMetadata,
  AiFoundationResponse,
  AiFoundationResult,
  AiFoundationSurface,
  AiFoundationTokenUsage,
  AiEngineeredPrompt,
  AiEngineeredPromptSections,
  AiMemoryMessage,
  AiProviderRequest,
  AiResolvedProviderBinding,
  AiToolExecution,
  AiToolExecutionStatus,
  AiToolId,
} from "./contracts/index.js";
export {
  emptyAiActiveContext,
  placeholderAiEffectivePolicy,
} from "./contracts/index.js";
export type {
  AiPipelineStage,
  AiRuntimePipelineState,
  AiRuntimePipelineRunOptions,
} from "./runtime/index.js";
export {
  AiRuntimePipeline,
  aiRuntimePipeline,
  requestStage,
  memoryLoadStage,
  contextStage,
  policyStage,
  providerResolutionStage,
  memoryStage,
  toolRegistryStage,
  toolDiscoveryStage,
  toolStage,
  toolRoutingStage,
  toolSelectionStage,
  toolPlanningStage,
  toolExecutionStage,
  toolResultValidationStage,
  toolResultInjectionStage,
  toolAuditStage,
  agentAnalyticsStage,
  agentResolutionStage,
  agentContextStage,
  agentPromptStrategyStage,
  agentMemoryStrategyStage,
  agentDecisionStage,
  agentCollaborationStage,
  agentPermissionsStage,
  businessQueryStage,
  moduleResolutionStage,
  moduleDataStage,
  businessReasoningStage,
  businessDecisionStage,
  businessActionStage,
  businessWorkflowStage,
  businessIntelligenceStage,
  businessRecommendationStage,
  businessExecutionStage,
  actionResolutionStage,
  actionPlanningStage,
  workflowOrchestrationStage,
  actionExecutionStage,
  automationStage,
  memoryRetrievalStage,
  memoryRankingStage,
  memorySemanticStage,
  memoryKnowledgeStage,
  memoryLongTermStage,
  memoryConsolidationStage,
  memoryWorkingStage,
  memoryEpisodicStage,
  memoryContextStage,
  promptEngineeringStage,
  providerRequestStage,
  providerStage,
  responseStage,
  memorySaveStage,
} from "./runtime/index.js";
export type {
  AiPolicyOverrides,
  ResolveAiEffectivePolicyInput,
} from "./settings/index.js";
export { resolveAiEffectivePolicy } from "./settings/index.js";
export { resolveProviderBinding } from "./provider-resolution/index.js";
export {
  applySlidingWindow,
  isAiHistoryWindowUnlimited,
  prepareProviderHistory,
  AI_MEMORY_TYPES,
  AI_MEMORY_SCOPES,
  AI_MEMORY_PRIORITIES,
  formatMemoryType,
  formatMemoryScope,
  formatMemoryPriority,
  formatMemoryContextForRuntime,
  AiMemoryRegistry,
  enterpriseMemoryRegistry,
  AiMemoryStore,
  createMemoryStore,
  AiMemoryManager,
  enterpriseMemoryManager,
  retrieveMemoryEntries,
  rankMemoryEntries,
  retrieveRuntimeMemoryEntries,
  rankRuntimeMemoryEntries,
  buildRuntimeMemoryContext,
  BUILTIN_MEMORY_SOURCES,
  loadPersistentMemory,
  savePersistentMemory,
  PersistentMemoryManager,
  persistentMemoryManager,
  PersistentMemoryProvider,
  persistentMemoryProvider,
  MemoryStorageAdapter,
  memoryStorageAdapter,
  AiPersistentMemoryRepository,
  aiPersistentMemoryRepository,
  AiMemoryCache,
  enterpriseMemoryCache,
  AiMemoryIndex,
  buildMemoryIndex,
  searchMemoryEntries,
  resolveMemoryExpiresAt,
  cleanupPersistentMemory,
  planMemorySync,
  resolveSemanticMemory,
  semanticMemoryEngine,
  buildKnowledgeMemory,
  formatSemanticKnowledgeForRuntime,
  searchSimilarMemories,
  resolveLongTermMemory,
  consolidateLongTermMemories,
  longTermMemoryEngine,
  resolveWorkingMemory,
  resolveEpisodicMemory,
  workingMemoryEngine,
  episodicMemoryEngine,
  buildMemoryOrchestration,
  resolveMemoryPlatform,
  formatMemoryPlatformForRuntime,
  validateMemoryIntegrity,
  optimizeMemoryPlatform,
  scoreMemoryHealth,
  buildMemoryDiagnostics,
  buildMemoryAnalytics,
} from "./memory/index.js";
export type {
  AiMemory,
  AiMemoryType,
  AiMemoryScope,
  AiMemoryPriority,
  AiMemoryEntry,
  AiMemoryContext,
  AiMemoryRanking,
  AiMemoryRankedItem,
  AiMemoryPolicies,
  AiMemoryPermissions,
  AiMemorySourceDefinition,
  MemoryManagerResolveInput,
  RetrieveMemoryInput,
  RankMemoryInput,
  AiLoadedMemory,
  AiMemoryPersistenceState,
  AiSavedMemory,
  AiSemanticMemory,
  AiKnowledgeMemory,
  AiKnowledgeGraphSummary,
  AiLongTermMemory,
  AiMemoryConsolidation,
  AiWorkingMemory,
  AiEpisodicMemory,
  AiMemoryOrchestration,
  AiMemoryPlatform,
  AiMemoryHealth,
  AiMemoryAnalytics,
  AiMemoryDiagnostics,
} from "./memory/index.js";
export type {
  AiContextHints,
  ResolveAiActiveContextInput,
} from "./context/index.js";
export { resolveAiActiveContext } from "./context/index.js";
export type {
  AiToolDefinition,
  AiToolRegistration,
  AiToolRoutingDecision,
  AiToolSelectionResult,
  AiToolSelectionDecision,
  AiToolExecutionPlan,
  AiToolPlanNode,
  ResolveEligibleToolsInput,
  RouteToolsInput,
  SelectToolsInput,
  AiValidatedToolResults,
  AiValidatedToolResult,
  ValidateToolResultsInput,
  AiToolAuditSummary,
  AiToolAuditRecord,
  AiToolLifecycleEvent,
  BuildToolAuditSummaryInput,
} from "./tools/index.js";
export {
  AI_TOOL_CATALOG,
  AiToolRegistry,
  enterpriseToolRegistry,
  discoverTools,
  routeTools,
  selectTools,
  buildToolExecutionPlan,
  resolveEligibleTools,
  executeEligibleTools,
  validateToolResults,
  validatedResultsToExecutions,
  buildToolAuditSummary,
  emitToolObservabilityLog,
} from "./tools/index.js";
export { formatToolResultsForRuntime } from "./tools/format-tool-results-for-runtime.js";
export {
  buildProviderRequest,
  toAiGenerateParams,
} from "./provider-request/index.js";
export {
  buildEngineeredPrompt,
  buildRuntimeInstructions,
} from "./prompt-engineering/index.js";
export type {
  BuildEngineeredPromptOptions,
  BuildRuntimeInstructionsInput,
} from "./prompt-engineering/index.js";
export type { ResolveBusinessContextInput } from "./business-context/index.js";
export {
  formatBusinessContextForRuntime,
  resolveBusinessContextSnippets,
} from "./business-context/index.js";
export type { ValidateFoundationResponseInput } from "./response/index.js";
export { validateFoundationResponse } from "./response/index.js";
export type {
  AiAgentType,
  AiAgentDefinition,
  AiActiveAgent,
  AiAgentMemoryPreferences,
  AiAgentExecutionHints,
  ResolveActiveAgentInput,
  AiAgentContext,
  AiAgentCapabilities,
  BuildAgentContextInput,
  AiAgentPromptStrategy,
  ResolveAgentPromptStrategyInput,
  AiAgentMemoryStrategy,
  ResolveAgentMemoryStrategyInput,
  AiAgentDecision,
  ResolveAgentDecisionInput,
  AiAgentCollaboration,
  ResolveAgentCollaborationInput,
  AiAgentPermissions,
  ResolveAgentPermissionsInput,
  AiAgentAnalytics,
  BuildAgentAnalyticsInput,
} from "./agents/index.js";
export {
  DEFAULT_CHAT_AGENT_ID,
  AiAgentRegistry,
  enterpriseAgentRegistry,
  resolveActiveAgent,
  resolveAgentCapabilities,
  buildAgentContext,
  formatAgentContextForRuntime,
  resolveAgentPromptStrategy,
  formatAgentPromptStrategyForRuntime,
  resolveAgentMemoryStrategy,
  resolveAgentDecision,
  formatAgentDecisionForRuntime,
  resolveAgentCollaboration,
  formatAgentCollaborationForRuntime,
  resolveAgentPermissions,
  formatAgentPermissionsForRuntime,
  buildAgentAnalytics,
  emitAgentAnalyticsLog,
  formatAgentAnalyticsForRuntime,
  BUILTIN_AGENTS,
  CHAT_AGENT,
  ANALYSIS_AGENT,
  DOCUMENT_AGENT,
  WORKFLOW_AGENT,
} from "./agents/index.js";
export type {
  AiEnterpriseModuleDefinition,
  AiEnterpriseModuleSummary,
  AiSelectedModules,
  ResolveSelectedModulesInput,
} from "./modules/index.js";
export {
  AiEnterpriseModuleRegistry,
  enterpriseModuleRegistry,
  resolveSelectedModules,
  formatSelectedModulesForRuntime,
  BUILTIN_ENTERPRISE_MODULES,
  CRM_MODULE,
  PROJECTS_MODULE,
  TASKS_MODULE,
  HRM_MODULE,
  FINANCE_MODULE,
  CALENDAR_MODULE,
  DOCUMENTS_MODULE,
  REPORTS_MODULE,
  NOTIFICATIONS_MODULE,
  SETTINGS_MODULE,
  STORAGE_MODULE,
} from "./modules/index.js";
export type {
  AiModuleDataBundle,
  AiModuleDataProvider,
  AiModuleDataRequest,
  AiModuleDataResponse,
  FetchModuleDataInput,
} from "./modules/index.js";
export {
  AiModuleDataRegistry,
  enterpriseModuleDataRegistry,
  resolveModuleDataProvider,
  fetchModuleData,
  formatModuleDataForRuntime,
  BUILTIN_MODULE_DATA_PROVIDERS,
} from "./modules/index.js";
export type {
  AiBusinessQuery,
  AiBusinessQueryIntent,
  AiBusinessQueryEntity,
  AiBusinessQueryFilter,
  AiBusinessQueryOutput,
  ResolveBusinessQueryInput,
  ParsedBusinessQuerySignals,
  BuildBusinessQueryInput,
} from "./business-query/index.js";
export {
  resolveBusinessQuery,
  businessQueryEngine,
  parseBusinessQuerySignals,
  buildBusinessQuery,
  formatBusinessQueryForRuntime,
  AI_BUSINESS_QUERY_INTENTS,
  AI_BUSINESS_QUERY_ENTITIES,
  AI_BUSINESS_QUERY_FILTERS,
} from "./business-query/index.js";
export type {
  AiBusinessReasoning,
  AiBusinessInsight,
  AiBusinessRisk,
  AiBusinessRecommendation as AiBusinessReasoningRecommendation,
  AiBusinessPriority,
  AiBusinessAnalysisItem,
  ResolveBusinessReasoningInput,
} from "./business-reasoning/index.js";
export {
  resolveBusinessReasoning,
  businessReasoningEngine,
  formatBusinessReasoningForRuntime,
  buildBusinessSummary,
} from "./business-reasoning/index.js";
export type {
  AiBusinessDecision,
  AiBusinessDecisionOption,
  AiBusinessDecisionPriority,
  AiBusinessDecisionImpact,
  AiBusinessDecisionRisk,
  AiBusinessDecisionRecommendation,
  ResolveBusinessDecisionInput,
} from "./business-decision/index.js";
export {
  resolveBusinessDecision,
  businessDecisionEngine,
  formatBusinessDecisionForRuntime,
} from "./business-decision/index.js";
export type {
  AiBusinessAction,
  AiBusinessActionPlan,
  AiBusinessActionPriority,
  AiBusinessActionRisk,
  AiBusinessActionPermissions,
  ResolveBusinessActionInput,
} from "./business-action/index.js";
export {
  resolveBusinessAction,
  businessActionEngine,
  formatBusinessActionForRuntime,
} from "./business-action/index.js";
export type {
  AiBusinessWorkflow,
  AiBusinessWorkflowDefinition,
  AiBusinessWorkflowStep,
  AiBusinessWorkflowTransition,
  AiBusinessWorkflowCondition,
  ResolveBusinessWorkflowInput,
} from "./business-workflow/index.js";
export {
  resolveBusinessWorkflow,
  businessWorkflowEngine,
  formatBusinessWorkflowForRuntime,
} from "./business-workflow/index.js";
export type {
  AiBusinessIntelligence,
  AiBiKpi,
  AiBiMetric,
  AiBiTrend,
  AiBiForecast,
  AiBiHealth,
  AiBiOpportunity,
  AiBiAlert,
  ResolveBusinessIntelligenceInput,
} from "./business-intelligence/index.js";
export {
  resolveBusinessIntelligence,
  businessIntelligenceEngine,
  formatBusinessIntelligenceForRuntime,
} from "./business-intelligence/index.js";
export type {
  AiBusinessRecommendation,
  AiBusinessRecommendationItem,
  AiBusinessRecommendationPriority,
  AiBusinessRecommendationImpact,
  ResolveBusinessRecommendationInput,
} from "./business-recommendation/index.js";
export {
  resolveBusinessRecommendation,
  businessRecommendationEngine,
  formatBusinessRecommendationForRuntime,
} from "./business-recommendation/index.js";
export type {
  AiBusinessExecution,
  AiBusinessExecutionPlan,
  AiBusinessExecutionPhase,
  AiBusinessExecutionTimeline,
  AiBusinessExecutionRisk,
  ResolveBusinessExecutionInput,
} from "./business-execution/index.js";
export {
  resolveBusinessExecution,
  businessExecutionEngine,
  formatBusinessExecutionForRuntime,
} from "./business-execution/index.js";
export type {
  AiActionCategory,
  AiActionDefinition,
  AiActiveAction,
  AiActionContext,
  AiActionResolutionInput,
  BuildActionContextInput,
  ResolveActiveActionInput,
  ResolveActiveActionResult,
} from "./action/index.js";
export {
  DEFAULT_GENERIC_ACTION_ID,
  AiActionRegistry,
  enterpriseActionRegistry,
  BUILTIN_ACTIONS,
  TASK_ACTION,
  PROJECT_ACTION,
  CRM_ACTION,
  CALENDAR_ACTION,
  DOCUMENT_ACTION,
  REPORT_ACTION,
  EMAIL_ACTION,
  WORKFLOW_ACTION,
  NOTIFICATION_ACTION,
  STORAGE_ACTION,
  SETTINGS_ACTION,
  GENERIC_ACTION,
  resolveActiveAction,
  buildActionContext,
  resolveActionIntentHints,
  resolveActionEntityHints,
  toActiveActionSummary,
  collectActionCapabilities,
  formatActiveActionForRuntime,
  formatActionContextForRuntime,
  resolveActionPlan,
  actionPlanEngine,
  formatActionPlanForRuntime,
  resolveActionExecution,
  actionExecutionEngine,
  formatActionExecutionForRuntime,
} from "./action/index.js";
export type {
  AiActionPlan,
  ResolveActionPlanInput,
  AiActionExecution,
  ResolveActionExecutionInput,
} from "./action/index.js";
export type {
  AiWorkflowKind,
  AiWorkflowDefinition,
  AiWorkflowPlan,
  AiWorkflowInstance,
  ResolveWorkflowPlanInput,
  OrchestrateWorkflowInput,
} from "./workflow/index.js";
export {
  resolveWorkflowPlan,
  workflowEngine,
  orchestrateWorkflow,
  workflowOrchestrator,
  formatWorkflowPlanForRuntime,
} from "./workflow/index.js";
export type {
  AiAutomationExecution,
  ResolveAutomationExecutionInput,
  AiAutomationProviderKind,
  AiAutomationProviderDefinition,
  AiAutomationStatus,
  AiAutomationRequest,
  AiAutomationResponse,
} from "./automation/index.js";
export {
  resolveAutomationExecution,
  automationEngine,
  AiAutomationProviderRegistry,
  enterpriseAutomationProviderRegistry,
  N8N_PROVIDER_ID,
  N8N_PROVIDER_DEFINITION,
  n8nAutomationProvider,
  createN8nProvider,
  formatAutomationExecutionForRuntime,
  formatAutomationStatus,
  formatAutomationProviderKind,
} from "./automation/index.js";
