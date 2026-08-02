/**
 * Memory strength scoring.
 */

import type { AiLongTermMemoryCategory } from "./long-term-memory-category.js";

export function scoreMemoryStrength(input: {
  readonly importance: number;
  readonly relevance: number;
  readonly recency: number;
  readonly category: AiLongTermMemoryCategory;
  readonly reinforced?: boolean;
}): number {
  const reinforce = input.reinforced ? 0.12 : 0;
  const categoryBoost =
    input.category === "preference" || input.category === "business"
      ? 0.08
      : 0;
  const score =
    input.importance * 0.4 +
    input.relevance * 0.3 +
    input.recency * 0.2 +
    reinforce +
    categoryBoost;
  return Math.min(1, Math.round(score * 1000) / 1000);
}
