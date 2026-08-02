/**
 * Memory consolidation — merge duplicates/similar, promote, archive low-value.
 */

import {
  freezeMemoryEntry,
  sanitizeMemoryText,
  type AiMemoryEntry,
} from "../memory-entry.js";
import type { AiLongTermMemoryEntry } from "./long-term-memory-entry.js";

export type AiConsolidationAction =
  | "kept"
  | "merged"
  | "promoted"
  | "archived"
  | "discarded";

export interface AiConsolidationItem {
  readonly entryId: string;
  readonly action: AiConsolidationAction;
  readonly reason: string;
}

export interface AiMemoryConsolidation {
  readonly items: readonly AiConsolidationItem[];
  readonly consolidatedEntries: readonly AiMemoryEntry[];
  readonly mergedCount: number;
  readonly archivedCount: number;
  readonly promotedCount: number;
  readonly preservedPreferences: number;
  readonly preservedBusiness: number;
  readonly summary: string;
  readonly confidence: number;
}

function nearDuplicate(a: AiMemoryEntry, b: AiMemoryEntry): boolean {
  const sa = a.summary.toLowerCase();
  const sb = b.summary.toLowerCase();
  if (sa === sb) return true;
  if (sa.length > 24 && sb.includes(sa.slice(0, 24))) return true;
  if (sb.length > 24 && sa.includes(sb.slice(0, 24))) return true;
  const tagsA = new Set(a.tags.map((t) => t.toLowerCase()));
  const shared = b.tags.filter((t) => tagsA.has(t.toLowerCase())).length;
  return (
    a.type === b.type &&
    shared >= 2 &&
    Math.abs(a.recency - b.recency) < 0.2
  );
}

function mergeEntries(a: AiMemoryEntry, b: AiMemoryEntry): AiMemoryEntry {
  const primary = a.recency >= b.recency ? a : b;
  const secondary = primary === a ? b : a;
  return freezeMemoryEntry({
    ...primary,
    id: `mem.consolidated.${primary.id}`,
    summary: sanitizeMemoryText(
      `${primary.summary} | ${secondary.summary}`,
      160,
    ),
    tags: Object.freeze([
      ...new Set([...primary.tags, ...secondary.tags, "consolidated"]),
    ].slice(0, 12)),
    recency: Math.max(primary.recency, secondary.recency),
    source: "memory-consolidation",
  });
}

/**
 * Consolidate long-term evaluated memories.
 */
export function consolidateLongTermMemories(input: {
  readonly longTermEntries: readonly AiLongTermMemoryEntry[];
}): AiMemoryConsolidation {
  const items: AiConsolidationItem[] = [];
  const kept: AiMemoryEntry[] = [];
  const consumed = new Set<string>();
  let mergedCount = 0;
  let archivedCount = 0;
  let promotedCount = 0;
  let preservedPreferences = 0;
  let preservedBusiness = 0;

  const ranked = [...input.longTermEntries].sort(
    (a, b) => b.importance - a.importance,
  );

  for (let i = 0; i < ranked.length; i += 1) {
    const current = ranked[i];
    if (!current || consumed.has(current.entry.id)) continue;

    if (current.forgotten) {
      consumed.add(current.entry.id);
      items.push(
        Object.freeze({
          entryId: current.entry.id,
          action: "discarded",
          reason: "forgotten",
        }),
      );
      continue;
    }

    if (current.category === "preference") {
      preservedPreferences += 1;
    }
    if (current.category === "business") {
      preservedBusiness += 1;
    }

    if (
      current.archived ||
      current.longTermPriority === "archive" ||
      (current.demoted && current.importance < 0.35)
    ) {
      consumed.add(current.entry.id);
      archivedCount += 1;
      items.push(
        Object.freeze({
          entryId: current.entry.id,
          action: "archived",
          reason: "low-value-archive",
        }),
      );
      continue;
    }

    let mergedInto: AiMemoryEntry | null = null;
    for (let j = i + 1; j < ranked.length; j += 1) {
      const other = ranked[j];
      if (!other || consumed.has(other.entry.id)) continue;
      if (other.forgotten || other.archived) continue;
      if (
        other.category === "preference" ||
        other.category === "business"
      ) {
        continue;
      }
      if (nearDuplicate(current.entry, other.entry)) {
        mergedInto = mergeEntries(
          mergedInto ?? current.entry,
          other.entry,
        );
        consumed.add(other.entry.id);
        mergedCount += 1;
        items.push(
          Object.freeze({
            entryId: other.entry.id,
            action: "merged",
            reason: `merged-into:${current.entry.id}`,
          }),
        );
      }
    }

    consumed.add(current.entry.id);
    if (mergedInto) {
      kept.push(mergedInto);
      items.push(
        Object.freeze({
          entryId: current.entry.id,
          action: "merged",
          reason: "merge-primary",
        }),
      );
    } else if (current.promoted) {
      promotedCount += 1;
      kept.push(current.entry);
      items.push(
        Object.freeze({
          entryId: current.entry.id,
          action: "promoted",
          reason: "promoted-keep",
        }),
      );
    } else {
      kept.push(current.entry);
      items.push(
        Object.freeze({
          entryId: current.entry.id,
          action: "kept",
          reason: "active",
        }),
      );
    }
  }

  const confidence =
    kept.length === 0
      ? 0
      : Math.min(1, 0.4 + kept.length * 0.05 + promotedCount * 0.03);

  return Object.freeze({
    items: Object.freeze(items.slice(0, 80)),
    consolidatedEntries: Object.freeze(kept.slice(0, 24)),
    mergedCount,
    archivedCount,
    promotedCount,
    preservedPreferences,
    preservedBusiness,
    summary: sanitizeMemoryText(
      `Consolidated ${kept.length} memories; merged=${mergedCount}; archived=${archivedCount}; promoted=${promotedCount}`,
      200,
    ),
    confidence: Math.round(confidence * 1000) / 1000,
  });
}
