/**
 * Memory loader — lazy load persistent memory into runtime state shape.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import {
  filterEntriesByPermissions,
  resolveMemoryPermissions,
} from "../memory-permissions.js";
import {
  persistentMemoryProvider,
  type PersistentMemoryProvider,
} from "./persistent-memory-provider.js";
import type { AiMemoryIndex } from "./memory-index.js";

export interface AiLoadedMemory {
  readonly entries: readonly AiMemoryEntry[];
  readonly fromCache: boolean;
  readonly searchUsed: boolean;
  readonly loadedAt: string;
  readonly entryCount: number;
}

export interface AiMemoryPersistenceState {
  readonly enabled: boolean;
  readonly cacheEnabled: boolean;
  readonly searchEnabled: boolean;
  readonly fromCache: boolean;
  readonly searchUsed: boolean;
  readonly indexSize: number;
  readonly notes: readonly string[];
}

export interface LoadPersistentMemoryInput {
  readonly userId: string;
  readonly conversationId?: string | null;
  readonly privacyMode: boolean;
  readonly permissions?: readonly string[] | null;
  readonly userPrompt?: string | null;
  readonly useCache: boolean;
  readonly enableSearch: boolean;
  readonly provider?: PersistentMemoryProvider;
}

export interface LoadPersistentMemoryResult {
  readonly loadedMemory: AiLoadedMemory;
  readonly memoryPersistence: AiMemoryPersistenceState;
  readonly index: AiMemoryIndex;
}

export async function loadPersistentMemory(
  input: LoadPersistentMemoryInput,
): Promise<LoadPersistentMemoryResult> {
  const provider = input.provider ?? persistentMemoryProvider;

  if (input.privacyMode) {
    const emptyIndex = (await import("./memory-index.js")).buildMemoryIndex([]);
    return Object.freeze({
      loadedMemory: Object.freeze({
        entries: Object.freeze([]),
        fromCache: false,
        searchUsed: false,
        loadedAt: new Date().toISOString(),
        entryCount: 0,
      }),
      memoryPersistence: Object.freeze({
        enabled: true,
        cacheEnabled: input.useCache,
        searchEnabled: input.enableSearch,
        fromCache: false,
        searchUsed: false,
        indexSize: 0,
        notes: Object.freeze(["privacy-mode"]),
      }),
      index: emptyIndex,
    });
  }

  const loaded = await provider.load({
    userId: input.userId,
    conversationId: input.conversationId,
    useCache: input.useCache,
    enableSearch: input.enableSearch,
    search: input.enableSearch
      ? { text: input.userPrompt ?? null, maxResults: 24 }
      : null,
    limit: 40,
  });

  const permissions = resolveMemoryPermissions({
    permissions: input.permissions,
    privacyMode: false,
  });
  const entries = filterEntriesByPermissions(
    loaded.entries,
    permissions,
    input.permissions,
  );

  const loadedMemory: AiLoadedMemory = Object.freeze({
    entries,
    fromCache: loaded.fromCache,
    searchUsed: loaded.searchUsed,
    loadedAt: new Date().toISOString(),
    entryCount: entries.length,
  });

  const memoryPersistence: AiMemoryPersistenceState = Object.freeze({
    enabled: true,
    cacheEnabled: input.useCache,
    searchEnabled: input.enableSearch,
    fromCache: loaded.fromCache,
    searchUsed: loaded.searchUsed,
    indexSize: loaded.index.size(),
    notes: Object.freeze([
      `loaded:${entries.length}`,
      loaded.fromCache ? "cache:hit" : "cache:miss",
      loaded.searchUsed ? "search:on" : "search:off",
    ]),
  });

  return Object.freeze({
    loadedMemory,
    memoryPersistence,
    index: loaded.index,
  });
}
