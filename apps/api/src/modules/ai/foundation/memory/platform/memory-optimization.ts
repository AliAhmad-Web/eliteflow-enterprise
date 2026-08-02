/**
 * Memory optimization — ranking refinement, cache/retrieval/storage hints.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import type { AiMemoryIntegrityReport } from "./memory-integrity.js";

export interface AiMemoryOptimization {
  readonly refinedEntryIds: readonly string[];
  readonly duplicatesRemoved: number;
  readonly staleRemoved: number;
  readonly cacheHint: "warm" | "cold" | "bypass";
  readonly retrievalHint: "adaptive" | "standard";
  readonly storageHint: "batch" | "defer" | "skip";
  readonly consolidationRecommended: boolean;
  readonly summary: string;
  readonly confidence: number;
}

export function optimizeMemoryPlatform(input: {
  readonly entries: readonly AiMemoryEntry[];
  readonly integrity: AiMemoryIntegrityReport;
  readonly fromCache?: boolean;
  readonly consolidationPresent?: boolean;
}): AiMemoryOptimization {
  const unique = new Map<string, AiMemoryEntry>();
  for (const entry of input.entries) {
    const key = `${entry.type}|${entry.summary.toLowerCase()}`;
    const existing = unique.get(key);
    if (!existing || entry.recency > existing.recency) {
      unique.set(key, entry);
    }
  }

  const refined = [...unique.values()]
    .filter((e) => !(e.recency < 0.15 && e.priority === "low"))
    .sort((a, b) => b.recency - a.recency || b.priority.localeCompare(a.priority));

  const duplicatesRemoved = Math.max(
    0,
    input.entries.length - unique.size,
  );
  const staleRemoved = Math.max(
    0,
    unique.size - refined.length,
  );

  const consolidationRecommended =
    !input.consolidationPresent &&
    (duplicatesRemoved > 0 || refined.length > 12);

  return Object.freeze({
    refinedEntryIds: Object.freeze(refined.slice(0, 24).map((e) => e.id)),
    duplicatesRemoved,
    staleRemoved,
    cacheHint: input.fromCache ? "warm" : "cold",
    retrievalHint: refined.length > 8 ? "adaptive" : "standard",
    storageHint: consolidationRecommended ? "batch" : "defer",
    consolidationRecommended,
    summary: `Optimized memories: kept=${refined.length}, dup-removed=${duplicatesRemoved}, stale-removed=${staleRemoved}`,
    confidence: Math.min(
      1,
      Math.round(
        (0.5 +
          (input.integrity.valid ? 0.25 : 0) +
          Math.min(0.25, refined.length * 0.02)) *
          1000,
      ) / 1000,
    ),
  });
}
