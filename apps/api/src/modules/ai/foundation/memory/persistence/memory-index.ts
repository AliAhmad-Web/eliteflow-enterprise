/**
 * Lightweight in-memory index over loaded persistent entries for fast lookup.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import type { AiMemoryType } from "../memory-types.js";

export class AiMemoryIndex {
  private readonly byId = new Map<string, AiMemoryEntry>();
  private readonly byType = new Map<AiMemoryType, AiMemoryEntry[]>();
  private readonly byTag = new Map<string, AiMemoryEntry[]>();

  rebuild(entries: readonly AiMemoryEntry[]): void {
    this.byId.clear();
    this.byType.clear();
    this.byTag.clear();

    for (const entry of entries) {
      this.byId.set(entry.id, entry);

      const typeBucket = this.byType.get(entry.type) ?? [];
      typeBucket.push(entry);
      this.byType.set(entry.type, typeBucket);

      for (const tag of entry.tags) {
        const key = tag.toLowerCase();
        const tagBucket = this.byTag.get(key) ?? [];
        tagBucket.push(entry);
        this.byTag.set(key, tagBucket);
      }
    }
  }

  get(id: string): AiMemoryEntry | undefined {
    return this.byId.get(id);
  }

  listByType(type: AiMemoryType): readonly AiMemoryEntry[] {
    return Object.freeze([...(this.byType.get(type) ?? [])]);
  }

  listByTag(tag: string): readonly AiMemoryEntry[] {
    return Object.freeze([...(this.byTag.get(tag.toLowerCase()) ?? [])]);
  }

  list(): readonly AiMemoryEntry[] {
    return Object.freeze([...this.byId.values()]);
  }

  size(): number {
    return this.byId.size;
  }
}

export function buildMemoryIndex(
  entries: readonly AiMemoryEntry[],
): AiMemoryIndex {
  const index = new AiMemoryIndex();
  index.rebuild(entries);
  return index;
}
