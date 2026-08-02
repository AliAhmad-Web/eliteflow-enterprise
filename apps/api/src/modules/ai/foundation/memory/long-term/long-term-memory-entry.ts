/**
 * Immutable long-term memory entry with intelligence scores.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import type { AiLongTermMemoryCategory } from "./long-term-memory-category.js";
import type { AiLongTermMemoryPriority } from "./long-term-memory-priority.js";
import type { AiMemoryRetentionPolicy } from "./long-term-memory-retention.js";
import type { AiLongTermMemoryLifecycleState } from "./long-term-memory-lifecycle.js";

export interface AiLongTermMemoryEntry {
  readonly entry: AiMemoryEntry;
  readonly category: AiLongTermMemoryCategory;
  readonly longTermPriority: AiLongTermMemoryPriority;
  readonly importance: number;
  readonly relevance: number;
  readonly strength: number;
  readonly ageFactor: number;
  readonly retention: AiMemoryRetentionPolicy;
  readonly lifecycle: AiLongTermMemoryLifecycleState;
  readonly promoted: boolean;
  readonly demoted: boolean;
  readonly forgotten: boolean;
  readonly archived: boolean;
  readonly notes: readonly string[];
}

export function freezeLongTermMemoryEntry(
  item: AiLongTermMemoryEntry,
): AiLongTermMemoryEntry {
  return Object.freeze({
    ...item,
    notes: Object.freeze([...item.notes]),
  });
}
