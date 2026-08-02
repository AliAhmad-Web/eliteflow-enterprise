/**
 * Runtime-only Enterprise AI Memory Store.
 * Ephemeral process memory — never writes to database or disk.
 */

import {
  freezeMemoryEntry,
  type AiMemoryEntry,
} from "./memory-entry.js";
import type { AiMemoryType } from "./memory-types.js";

/**
 * In-memory store for request-scoped / process-ephemeral memory entries.
 */
export class AiMemoryStore {
  private readonly byId = new Map<string, AiMemoryEntry>();

  clear(): void {
    this.byId.clear();
  }

  put(entry: AiMemoryEntry): AiMemoryEntry {
    const frozen = freezeMemoryEntry(entry);
    this.byId.set(frozen.id, frozen);
    return frozen;
  }

  putMany(entries: readonly AiMemoryEntry[]): readonly AiMemoryEntry[] {
    const frozen = entries.map((e) => this.put(e));
    return Object.freeze(frozen);
  }

  get(id: string): AiMemoryEntry | undefined {
    return this.byId.get(id);
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  delete(id: string): boolean {
    return this.byId.delete(id);
  }

  list(): readonly AiMemoryEntry[] {
    return Object.freeze([...this.byId.values()]);
  }

  listByType(type: AiMemoryType): readonly AiMemoryEntry[] {
    return Object.freeze(
      [...this.byId.values()].filter((entry) => entry.type === type),
    );
  }

  size(): number {
    return this.byId.size;
  }
}

/**
 * Create a fresh request-scoped store (preferred over sharing process state).
 */
export function createMemoryStore(
  seed: readonly AiMemoryEntry[] = [],
): AiMemoryStore {
  const store = new AiMemoryStore();
  if (seed.length > 0) {
    store.putMany(seed);
  }
  return store;
}
