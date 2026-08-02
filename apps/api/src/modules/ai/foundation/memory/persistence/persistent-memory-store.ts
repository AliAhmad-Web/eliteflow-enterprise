/**
 * Persistent memory store — request-scoped holder for loaded/persisted entries.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import { AiMemoryIndex, buildMemoryIndex } from "./memory-index.js";

export class AiPersistentMemoryStore {
  private entries: readonly AiMemoryEntry[] = Object.freeze([]);
  private index: AiMemoryIndex = buildMemoryIndex([]);

  setEntries(entries: readonly AiMemoryEntry[]): void {
    this.entries = Object.freeze([...entries]);
    this.index = buildMemoryIndex(this.entries);
  }

  getEntries(): readonly AiMemoryEntry[] {
    return this.entries;
  }

  getIndex(): AiMemoryIndex {
    return this.index;
  }

  clear(): void {
    this.entries = Object.freeze([]);
    this.index = buildMemoryIndex([]);
  }
}

export function createPersistentMemoryStore(
  seed: readonly AiMemoryEntry[] = [],
): AiPersistentMemoryStore {
  const store = new AiPersistentMemoryStore();
  if (seed.length > 0) store.setEntries(seed);
  return store;
}
