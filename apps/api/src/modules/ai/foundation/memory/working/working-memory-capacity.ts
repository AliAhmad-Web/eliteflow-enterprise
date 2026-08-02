/**
 * Working memory capacity limits and eviction.
 */

import type { AiWorkingMemoryEntry } from "./working-memory-entry.js";
import { workingMemoryPriorityWeight } from "./working-memory-priority.js";

export interface AiWorkingMemoryCapacity {
  readonly maxEntries: number;
  readonly maxTokensEstimate: number;
  readonly usedEntries: number;
  readonly evictedCount: number;
}

export function resolveWorkingMemoryCapacity(input: {
  readonly mode?: string | null;
}): { readonly maxEntries: number; readonly maxTokensEstimate: number } {
  const mode = (input.mode ?? "ASK").toUpperCase();
  if (mode === "ANALYZE" || mode === "DOCUMENT") {
    return Object.freeze({ maxEntries: 10, maxTokensEstimate: 1800 });
  }
  return Object.freeze({ maxEntries: 8, maxTokensEstimate: 1200 });
}

/**
 * Evict lowest-priority / oldest entries until within capacity.
 */
export function applyWorkingMemoryCapacity(
  entries: readonly AiWorkingMemoryEntry[],
  maxEntries: number,
): {
  readonly kept: readonly AiWorkingMemoryEntry[];
  readonly evictedCount: number;
} {
  if (entries.length <= maxEntries) {
    return Object.freeze({
      kept: Object.freeze([...entries]),
      evictedCount: 0,
    });
  }

  const sorted = [...entries].sort((a, b) => {
    const pw =
      workingMemoryPriorityWeight(b.priority) -
      workingMemoryPriorityWeight(a.priority);
    if (pw !== 0) return pw;
    return b.recency - a.recency;
  });

  const kept = sorted.slice(0, maxEntries);
  return Object.freeze({
    kept: Object.freeze(kept),
    evictedCount: entries.length - kept.length,
  });
}
