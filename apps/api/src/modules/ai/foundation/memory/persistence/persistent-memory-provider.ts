/**
 * Persistent memory provider — cache, search, and storage orchestration.
 * Permission filtering is applied by callers (loader/manager/stages).
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import type { AiMemoryType } from "../memory-types.js";
import {
  AiMemoryCache,
  enterpriseMemoryCache,
} from "./memory-cache.js";
import { buildMemoryIndex, type AiMemoryIndex } from "./memory-index.js";
import { searchMemoryEntries, type MemorySearchQuery } from "./memory-search.js";
import {
  MemoryStorageAdapter,
  memoryStorageAdapter,
} from "./memory-storage-adapter.js";

export interface PersistentMemoryProviderLoadInput {
  readonly userId: string;
  readonly conversationId?: string | null;
  readonly types?: readonly AiMemoryType[];
  readonly limit?: number;
  readonly useCache?: boolean;
  readonly search?: MemorySearchQuery | null;
  readonly enableSearch?: boolean;
}

export interface PersistentMemoryProviderLoadResult {
  readonly entries: readonly AiMemoryEntry[];
  readonly fromCache: boolean;
  readonly searchUsed: boolean;
  readonly index: AiMemoryIndex;
}

export interface PersistentMemoryProviderSaveInput {
  readonly userId: string;
  readonly conversationId?: string | null;
  readonly entries: readonly AiMemoryEntry[];
}

export class PersistentMemoryProvider {
  constructor(
    private readonly adapter: MemoryStorageAdapter = memoryStorageAdapter,
    private readonly cache: AiMemoryCache = enterpriseMemoryCache,
  ) {}

  async load(
    input: PersistentMemoryProviderLoadInput,
  ): Promise<PersistentMemoryProviderLoadResult> {
    const cacheKey = AiMemoryCache.cacheKey({
      userId: input.userId,
      conversationId: input.conversationId,
    });

    let entries: readonly AiMemoryEntry[] | null = null;
    let fromCache = false;

    if (input.useCache) {
      entries = this.cache.get(cacheKey);
      fromCache = entries != null;
    }

    if (entries == null) {
      entries = await this.adapter.load({
        userId: input.userId,
        conversationId: input.conversationId,
        types: input.types,
        limit: input.limit,
        compress: true,
      });
      if (input.useCache) {
        this.cache.set(cacheKey, entries);
      }
      fromCache = false;
    }

    let searchUsed = false;
    if (input.enableSearch && input.search) {
      const result = searchMemoryEntries(entries, input.search);
      entries = result.entries;
      searchUsed = true;
    }

    const index = buildMemoryIndex(entries);
    return Object.freeze({
      entries,
      fromCache,
      searchUsed,
      index,
    });
  }

  async save(input: PersistentMemoryProviderSaveInput): Promise<readonly string[]> {
    const keys = await this.adapter.save(input);
    this.cache.invalidateUser(input.userId);
    return keys;
  }
}

export const persistentMemoryProvider = new PersistentMemoryProvider();
