/**
 * Persistent Memory Manager — orchestrates load/save/cache/search/cleanup.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import { cleanupPersistentMemory } from "./memory-cleanup.js";
import {
  loadPersistentMemory,
  type AiLoadedMemory,
  type AiMemoryPersistenceState,
  type LoadPersistentMemoryResult,
} from "./memory-loader.js";
import {
  savePersistentMemory,
  type AiSavedMemory,
} from "./memory-saver.js";
import { createPersistentMemoryStore } from "./persistent-memory-store.js";
import type { PersistentMemoryProvider } from "./persistent-memory-provider.js";
import { persistentMemoryProvider } from "./persistent-memory-provider.js";

export interface PersistentMemoryManagerLoadInput {
  readonly userId: string;
  readonly conversationId?: string | null;
  readonly privacyMode: boolean;
  readonly permissions?: readonly string[] | null;
  readonly userPrompt?: string | null;
  readonly useCache: boolean;
  readonly enableSearch: boolean;
}

export interface PersistentMemoryManagerSaveInput {
  readonly userId: string;
  readonly conversationId?: string | null;
  readonly privacyMode: boolean;
  readonly entries: readonly AiMemoryEntry[];
  readonly background?: boolean;
}

export class PersistentMemoryManager {
  private readonly store = createPersistentMemoryStore();

  constructor(
    private readonly provider: PersistentMemoryProvider = persistentMemoryProvider,
  ) {}

  async load(
    input: PersistentMemoryManagerLoadInput,
  ): Promise<LoadPersistentMemoryResult> {
    const result = await loadPersistentMemory({
      ...input,
      provider: this.provider,
    });
    this.store.setEntries(result.loadedMemory.entries);
    return result;
  }

  async save(
    input: PersistentMemoryManagerSaveInput,
  ): Promise<AiSavedMemory> {
    return savePersistentMemory({
      ...input,
      provider: this.provider,
      runCleanup: true,
    });
  }

  async cleanup(userId: string) {
    return cleanupPersistentMemory({ userId });
  }

  getLoadedEntries(): readonly AiMemoryEntry[] {
    return this.store.getEntries();
  }
}

export const persistentMemoryManager = new PersistentMemoryManager();

export type {
  AiLoadedMemory,
  AiMemoryPersistenceState,
  AiSavedMemory,
};
