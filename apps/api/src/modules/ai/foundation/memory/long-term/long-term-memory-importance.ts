/**
 * Importance scoring for long-term memory candidacy.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import type { AiLongTermMemoryCategory } from "./long-term-memory-category.js";
import { memoryPriorityWeight } from "../memory-priority.js";

const CATEGORY_WEIGHT: Readonly<Record<AiLongTermMemoryCategory, number>> = {
  preference: 1,
  business: 0.9,
  user: 0.8,
  knowledge: 0.75,
  operational: 0.55,
  session: 0.4,
  ephemeral: 0.15,
};

export function scoreMemoryImportance(input: {
  readonly entry: AiMemoryEntry;
  readonly category: AiLongTermMemoryCategory;
  readonly semanticScore?: number;
}): number {
  const category = CATEGORY_WEIGHT[input.category];
  const priority = memoryPriorityWeight(input.entry.priority);
  const recency = input.entry.recency;
  const semantic = input.semanticScore ?? 0.4;
  const preserveBoost =
    input.category === "preference" || input.category === "business"
      ? 0.15
      : 0;

  const score =
    category * 0.35 +
    priority * 0.2 +
    recency * 0.15 +
    semantic * 0.15 +
    preserveBoost;

  return Math.min(1, Math.round(score * 1000) / 1000);
}
