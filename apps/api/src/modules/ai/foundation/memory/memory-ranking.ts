/**
 * Enterprise AI Memory ranking — score and order retrieved entries.
 * Never executes tools. Never persists.
 */

import type { AiMemoryEntry } from "./memory-entry.js";
import { memoryPriorityWeight } from "./memory-priority.js";
import type { AiMemoryType } from "./memory-types.js";

const TYPE_WEIGHT: Readonly<Record<AiMemoryType, number>> = {
  working: 1,
  conversation: 0.9,
  context: 0.85,
  business: 0.8,
  longterm: 0.78,
  preference: 0.7,
  session: 0.65,
  user: 0.6,
};

export interface AiMemoryRankedItem {
  readonly entry: AiMemoryEntry;
  /** Aggregate relevance score 0–1. */
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface AiMemoryRanking {
  readonly items: readonly AiMemoryRankedItem[];
  readonly rankedEntries: readonly AiMemoryEntry[];
  readonly confidence: number;
  readonly summary: string;
}

export interface RankMemoryInput {
  readonly entries: readonly AiMemoryEntry[];
  readonly userPrompt?: string | null;
  readonly mode?: string | null;
  readonly maxItems?: number;
}

function scoreEntry(
  entry: AiMemoryEntry,
  promptTokens: readonly string[],
): AiMemoryRankedItem {
  const reasons: string[] = [];
  let score = 0;

  const typeWeight = TYPE_WEIGHT[entry.type];
  score += typeWeight * 0.35;
  reasons.push(`type:${entry.type}`);

  const priorityWeight = memoryPriorityWeight(entry.priority);
  score += priorityWeight * 0.25;
  reasons.push(`priority:${entry.priority}`);

  score += entry.recency * 0.25;
  reasons.push(`recency:${entry.recency.toFixed(2)}`);

  if (promptTokens.length > 0) {
    const haystack = `${entry.summary} ${entry.tags.join(" ")}`.toLowerCase();
    const hits = promptTokens.filter((t) => haystack.includes(t)).length;
    const overlap = Math.min(1, hits / Math.max(1, promptTokens.length));
    score += overlap * 0.15;
    if (hits > 0) {
      reasons.push(`prompt-overlap:${hits}`);
    }
  }

  return Object.freeze({
    entry,
    score: Math.min(1, Math.round(score * 1000) / 1000),
    reasons: Object.freeze(reasons.slice(0, 6)),
  });
}

function tokenizePrompt(prompt: string): readonly string[] {
  return prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length >= 3)
    .slice(0, 24);
}

/**
 * Rank memory entries by type, priority, recency, and prompt overlap.
 */
export function rankMemoryEntries(input: RankMemoryInput): AiMemoryRanking {
  const maxItems = input.maxItems ?? 12;
  const promptTokens = tokenizePrompt(input.userPrompt?.trim() ?? "");

  const items = Object.freeze(
    [...input.entries]
      .map((entry) => scoreEntry(entry, promptTokens))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxItems),
  );

  const rankedEntries = Object.freeze(items.map((i) => i.entry));
  const confidence =
    items.length === 0
      ? 0
      : Math.min(
          1,
          items.reduce((sum, i) => sum + i.score, 0) / items.length,
        );

  const top = items[0];
  const summary =
    items.length === 0
      ? "No memory entries to rank."
      : `Ranked ${items.length} memory item${items.length === 1 ? "" : "s"}; top=${top?.entry.type ?? "none"} (${(top?.score ?? 0).toFixed(2)}).`;

  return Object.freeze({
    items,
    rankedEntries,
    confidence: Math.round(confidence * 1000) / 1000,
    summary,
  });
}
