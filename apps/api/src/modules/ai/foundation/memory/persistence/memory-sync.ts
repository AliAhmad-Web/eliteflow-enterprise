/**
 * Memory sync — align runtime entries with persistence keys.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import { buildMemoryKey } from "./memory-serializer.js";

export interface MemorySyncPlan {
  readonly toUpsert: readonly AiMemoryEntry[];
  readonly skipped: number;
  readonly summary: string;
}

const PERSISTABLE_TYPES = new Set([
  "conversation",
  "user",
  "business",
  "preference",
  "session",
  "longterm",
]);

/**
 * Select which runtime entries should be persisted (batched upsert set).
 */
export function planMemorySync(
  entries: readonly AiMemoryEntry[],
  options: { readonly maxBatch?: number } = {},
): MemorySyncPlan {
  const maxBatch = options.maxBatch ?? 20;
  const seen = new Set<string>();
  const toUpsert: AiMemoryEntry[] = [];

  for (const entry of entries) {
    if (!PERSISTABLE_TYPES.has(entry.type)) continue;
    if (entry.type === "working" || entry.type === "context") continue;
    const key = buildMemoryKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    toUpsert.push(entry);
    if (toUpsert.length >= maxBatch) break;
  }

  return Object.freeze({
    toUpsert: Object.freeze(toUpsert),
    skipped: Math.max(0, entries.length - toUpsert.length),
    summary: `upsert:${toUpsert.length};skipped:${Math.max(0, entries.length - toUpsert.length)}`,
  });
}
