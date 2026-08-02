/**
 * Semantic memory entry — entry plus semantic metadata (no raw vectors in state).
 */

import type { AiMemoryEntry } from "../memory-entry.js";

export interface AiSemanticMemoryEntry {
  readonly entry: AiMemoryEntry;
  readonly semanticScore: number;
  readonly clusterId: string | null;
  readonly isDuplicate: boolean;
  readonly topics: readonly string[];
}

export function freezeSemanticMemoryEntry(
  item: AiSemanticMemoryEntry,
): AiSemanticMemoryEntry {
  return Object.freeze({
    ...item,
    topics: Object.freeze([...item.topics]),
  });
}
