/**
 * Enterprise AI Memory Foundation public exports.
 * Preserves legacy conversation-history helpers for the Memory Stage.
 */

export {
  applySlidingWindow,
  isAiHistoryWindowUnlimited,
  prepareProviderHistory,
} from "./prepare-provider-history.js";
export type { PrepareProviderHistoryInput } from "./prepare-provider-history.js";

export type { AiMemory } from "./ai-memory.js";

export type { AiMemoryType } from "./memory-types.js";
export {
  AI_MEMORY_TYPES,
  formatMemoryType,
  isAiMemoryType,
} from "./memory-types.js";

export type { AiMemoryScope } from "./memory-scope.js";
export {
  AI_MEMORY_SCOPES,
  formatMemoryScope,
  isAiMemoryScope,
} from "./memory-scope.js";

export type { AiMemoryPriority } from "./memory-priority.js";
export {
  AI_MEMORY_PRIORITIES,
  formatMemoryPriority,
  memoryPriorityWeight,
  resolveMemoryPriority,
} from "./memory-priority.js";

export type { AiMemoryEntry } from "./memory-entry.js";
export {
  freezeMemoryEntry,
  sanitizeMemoryText,
} from "./memory-entry.js";

export type { AiMemoryContext } from "./memory-context.js";
export {
  countMemoryTypes,
  emptyTypeCounts,
} from "./memory-context.js";

export type {
  AiMemoryPolicies,
  AiMemoryRetentionPolicy,
  AiMemoryPrivacyPolicy,
} from "./memory-policies.js";
export {
  formatMemoryRetentionPolicy,
  formatMemoryPrivacyPolicy,
  resolveMemoryPolicies,
} from "./memory-policies.js";

export type {
  AiMemoryPermissions,
  AiMemoryAccessLevel,
} from "./memory-permissions.js";
export {
  formatMemoryAccessLevel,
  resolveMemoryPermissions,
  filterEntriesByPermissions,
} from "./memory-permissions.js";

export type { AiMemoryFilterCriteria } from "./memory-filter.js";
export { filterMemoryEntries } from "./memory-filter.js";

export type { CompressMemoryInput } from "./memory-compression.js";
export { compressMemoryEntries } from "./memory-compression.js";

export type { SummarizeMemoryInput } from "./memory-summarization.js";
export {
  summarizeMemoryEntries,
  buildMemoryContextSummary,
} from "./memory-summarization.js";

export type {
  AiMemoryRanking,
  AiMemoryRankedItem,
  RankMemoryInput,
} from "./memory-ranking.js";
export { rankMemoryEntries } from "./memory-ranking.js";

export type { RetrieveMemoryInput } from "./memory-retrieval.js";
export { retrieveMemoryEntries } from "./memory-retrieval.js";

export type { AiMemorySourceDefinition } from "./memory-registry.js";
export {
  AiMemoryRegistry,
  BUILTIN_MEMORY_SOURCES,
  enterpriseMemoryRegistry,
} from "./memory-registry.js";

export { AiMemoryStore, createMemoryStore } from "./memory-store.js";

export type { MemoryManagerResolveInput } from "./memory-manager.js";
export {
  AiMemoryManager,
  enterpriseMemoryManager,
  retrieveRuntimeMemoryEntries,
  rankRuntimeMemoryEntries,
  buildRuntimeMemoryContext,
} from "./memory-manager.js";

export { formatMemoryContextForRuntime } from "./memory-runtime.js";

export type {
  AiLoadedMemory,
  AiMemoryPersistenceState,
  AiSavedMemory,
  MemorySearchQuery,
  MemorySearchResult,
  MemorySyncPlan,
  SerializedMemoryRecord,
  LoadPersistentMemoryInput,
  SavePersistentMemoryInput,
} from "./persistence/index.js";
export {
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
  serializeMemoryEntry,
  deserializeMemoryEntry,
  deserializeMemoryRows,
  enqueueMemoryBackgroundJob,
  runMemoryJob,
} from "./persistence/index.js";

export type {
  AiSemanticMemory,
  AiSemanticMemoryEntry,
  AiSemanticMemoryQuery,
  AiSemanticMemoryResult,
  AiKnowledgeMemory,
  AiKnowledgeGraph,
  AiKnowledgeGraphSummary,
  AiMemoryRelation,
  AiMemoryEmbedding,
  ResolveSemanticMemoryInput,
} from "./semantic/index.js";
export {
  resolveSemanticMemory,
  semanticMemoryEngine,
  buildKnowledgeMemory,
  buildKnowledgeGraph,
  searchSimilarMemories,
  buildMemoryRelations,
  linkRelatedMemories,
  formatSemanticKnowledgeForRuntime,
  enterpriseEmbeddingRegistry,
  defaultEmbeddingProvider,
  createLocalLexicalEmbeddingProvider,
} from "./semantic/index.js";

export type {
  AiLongTermMemory,
  AiLongTermMemoryEntry,
  AiLongTermMemoryProfile,
  AiMemoryConsolidation,
  ResolveLongTermMemoryInput,
} from "./long-term/index.js";
export {
  resolveLongTermMemory,
  longTermMemoryEngine,
  consolidateLongTermMemories,
  longTermMemoryManager,
  AiLongTermMemoryManager,
  formatLongTermMemoryForRuntime,
} from "./long-term/index.js";

export type {
  AiWorkingMemory,
  AiWorkingMemoryEntry,
  ResolveWorkingMemoryInput,
} from "./working/index.js";
export {
  resolveWorkingMemory,
  workingMemoryEngine,
  workingMemoryManager,
  formatWorkingMemoryForRuntime,
} from "./working/index.js";

export type {
  AiEpisodicMemory,
  AiEpisodicMemoryEntry,
  AiEpisodicMemoryEpisode,
  AiEpisodicMemoryEvent,
  ResolveEpisodicMemoryInput,
} from "./episodic/index.js";
export {
  resolveEpisodicMemory,
  episodicMemoryEngine,
  episodicMemoryManager,
  formatEpisodicMemoryForRuntime,
  buildEpisodicTimeline,
  linkEpisodicEvents,
} from "./episodic/index.js";

export type {
  AiMemoryLifecyclePhase,
  AiMemoryLifecyclePlan,
  AiMemoryOrchestration,
  AiMemorySubsystemStatus,
  AiMemoryIntegrityReport,
  AiMemoryOptimization,
  AiMemoryHealth,
  AiMemoryDiagnostics,
  AiMemoryDiagnosticFinding,
  AiMemoryAnalytics,
  AiMemoryPerformanceMetrics,
  AiMemoryTelemetry,
  AiMemoryTelemetryEvent,
  AiMemoryMonitoring,
  AiMemoryPlatform,
  ResolveMemoryPlatformInput,
} from "./platform/index.js";
export {
  AI_MEMORY_LIFECYCLE_ORDER,
  formatMemoryLifecyclePhase,
  buildMemoryLifecyclePlan,
  buildMemoryOrchestration,
  memoryOrchestrator,
  validateMemoryIntegrity,
  optimizeMemoryPlatform,
  scoreMemoryHealth,
  buildMemoryDiagnostics,
  buildMemoryAnalytics,
  buildMemoryPerformanceMetrics,
  buildMemoryTelemetry,
  buildMemoryMonitoring,
  emitMemoryMonitoringLog,
  resolveMemoryPlatform,
  scheduleMemoryOptimizationJob,
  queueMemoryPlatformMaintenance,
  formatMemoryPlatformForRuntime,
} from "./platform/index.js";
