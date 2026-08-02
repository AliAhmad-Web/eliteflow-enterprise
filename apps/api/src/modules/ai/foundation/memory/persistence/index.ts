/**
 * Enterprise Persistent AI Memory public exports.
 */

export type {
  AiLoadedMemory,
  AiMemoryPersistenceState,
  LoadPersistentMemoryInput,
  LoadPersistentMemoryResult,
} from "./memory-loader.js";
export { loadPersistentMemory } from "./memory-loader.js";

export type {
  AiSavedMemory,
  SavePersistentMemoryInput,
} from "./memory-saver.js";
export { savePersistentMemory } from "./memory-saver.js";

export type {
  PersistentMemoryManagerLoadInput,
  PersistentMemoryManagerSaveInput,
} from "./persistent-memory-manager.js";
export {
  PersistentMemoryManager,
  persistentMemoryManager,
} from "./persistent-memory-manager.js";

export {
  PersistentMemoryProvider,
  persistentMemoryProvider,
} from "./persistent-memory-provider.js";
export type {
  PersistentMemoryProviderLoadInput,
  PersistentMemoryProviderLoadResult,
  PersistentMemoryProviderSaveInput,
} from "./persistent-memory-provider.js";

export {
  AiPersistentMemoryStore,
  createPersistentMemoryStore,
} from "./persistent-memory-store.js";

export {
  MemoryStorageAdapter,
  memoryStorageAdapter,
} from "./memory-storage-adapter.js";
export type {
  MemoryStorageLoadInput,
  MemoryStorageSaveInput,
} from "./memory-storage-adapter.js";

export {
  AiPersistentMemoryRepository,
  aiPersistentMemoryRepository,
} from "./memory-repository.js";
export type {
  ListMemoryRecordsInput,
  UpsertMemoryRecordInput,
} from "./memory-repository.js";

export {
  AiMemoryCache,
  enterpriseMemoryCache,
} from "./memory-cache.js";
export type { MemoryCacheEntry } from "./memory-cache.js";

export {
  AiMemoryIndex,
  buildMemoryIndex,
} from "./memory-index.js";

export {
  searchMemoryEntries,
} from "./memory-search.js";
export type {
  MemorySearchQuery,
  MemorySearchResult,
} from "./memory-search.js";

export {
  resolveMemoryExpiresAt,
  isMemoryExpired,
  filterExpiredEntries,
} from "./memory-expiration.js";

export {
  cleanupPersistentMemory,
} from "./memory-cleanup.js";
export type {
  MemoryCleanupResult,
  CleanupMemoryInput,
} from "./memory-cleanup.js";

export {
  planMemorySync,
} from "./memory-sync.js";
export type { MemorySyncPlan } from "./memory-sync.js";

export {
  serializeMemoryEntry,
  deserializeMemoryEntry,
  serializeMemoryTags,
  serializePermissionKeys,
  deserializeStringArray,
  buildMemoryKey,
} from "./memory-serializer.js";
export type { SerializedMemoryRecord } from "./memory-serializer.js";

export {
  deserializeMemoryRows,
  rowToSerializedRecord,
} from "./memory-deserializer.js";
export type { PersistableMemoryRow } from "./memory-deserializer.js";

export {
  enqueueMemoryBackgroundJob,
  runMemoryJob,
  pendingMemoryJobCount,
} from "./memory-background-jobs.js";
export type { MemoryBackgroundJob } from "./memory-background-jobs.js";
