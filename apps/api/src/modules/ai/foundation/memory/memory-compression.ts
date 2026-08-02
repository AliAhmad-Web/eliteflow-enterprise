/**
 * Enterprise AI Memory compression — reduce entry volume for context windows.
 * Deterministic, non-LLM compaction. Never persists.
 */

import {
  freezeMemoryEntry,
  sanitizeMemoryText,
  type AiMemoryEntry,
} from "./memory-entry.js";
import type { AiMemoryType } from "./memory-types.js";

export interface CompressMemoryInput {
  readonly entries: readonly AiMemoryEntry[];
  readonly maxEntries: number;
  readonly maxSummaryLength?: number;
}

/**
 * Compress memory entries by merging same-type low-priority items and truncating.
 */
export function compressMemoryEntries(
  input: CompressMemoryInput,
): readonly AiMemoryEntry[] {
  const maxSummary = input.maxSummaryLength ?? 120;
  if (input.entries.length === 0) {
    return Object.freeze([]);
  }

  if (input.entries.length <= input.maxEntries) {
    return Object.freeze(
      input.entries.map((e) =>
        freezeMemoryEntry({
          ...e,
          summary: sanitizeMemoryText(e.summary, maxSummary),
        }),
      ),
    );
  }

  const byType = new Map<AiMemoryType, AiMemoryEntry[]>();
  for (const entry of input.entries) {
    const bucket = byType.get(entry.type) ?? [];
    bucket.push(entry);
    byType.set(entry.type, bucket);
  }

  const compressed: AiMemoryEntry[] = [];

  for (const [type, bucket] of byType) {
    if (bucket.length === 1) {
      const only = bucket[0];
      if (only) {
        compressed.push(
          freezeMemoryEntry({
            ...only,
            summary: sanitizeMemoryText(only.summary, maxSummary),
          }),
        );
      }
      continue;
    }

    const sorted = [...bucket].sort(
      (a, b) => b.recency - a.recency || b.priority.localeCompare(a.priority),
    );
    const keep = sorted.slice(0, Math.max(1, Math.ceil(input.maxEntries / byType.size)));
    const overflow = sorted.slice(keep.length);

    for (const entry of keep) {
      compressed.push(
        freezeMemoryEntry({
          ...entry,
          summary: sanitizeMemoryText(entry.summary, maxSummary),
        }),
      );
    }

    if (overflow.length > 0) {
      const first = overflow[0];
      if (first) {
        compressed.push(
          freezeMemoryEntry({
            id: `mem.compress.${type}`,
            type,
            scope: first.scope,
            priority: "low",
            summary: sanitizeMemoryText(
              `Compressed ${overflow.length} additional ${type} memories.`,
              maxSummary,
            ),
            source: "memory-compression",
            permissionKeys: Object.freeze([]),
            tags: Object.freeze(["compressed", type]),
            recency: Math.max(...overflow.map((e) => e.recency)),
            createdAt: new Date().toISOString(),
          }),
        );
      }
    }
  }

  return Object.freeze(
    compressed
      .sort((a, b) => b.recency - a.recency)
      .slice(0, Math.max(1, input.maxEntries)),
  );
}
