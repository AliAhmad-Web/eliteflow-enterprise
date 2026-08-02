/**
 * Long-term memory profile — aggregate intelligence snapshot.
 */

import type { AiLongTermMemoryCategory } from "./long-term-memory-category.js";

export interface AiLongTermMemoryProfile {
  readonly total: number;
  readonly promoted: number;
  readonly demoted: number;
  readonly forgotten: number;
  readonly archived: number;
  readonly averageImportance: number;
  readonly averageStrength: number;
  readonly categoryCounts: Readonly<Record<AiLongTermMemoryCategory, number>>;
  readonly summary: string;
}

export function emptyCategoryCounts(): Record<AiLongTermMemoryCategory, number> {
  return {
    preference: 0,
    business: 0,
    user: 0,
    session: 0,
    knowledge: 0,
    operational: 0,
    ephemeral: 0,
  };
}

export function buildLongTermMemoryProfile(input: {
  readonly total: number;
  readonly promoted: number;
  readonly demoted: number;
  readonly forgotten: number;
  readonly archived: number;
  readonly averageImportance: number;
  readonly averageStrength: number;
  readonly categoryCounts: Readonly<Record<AiLongTermMemoryCategory, number>>;
}): AiLongTermMemoryProfile {
  const summary = [
    `${input.total} long-term memories`,
    `promoted=${input.promoted}`,
    `demoted=${input.demoted}`,
    `forgotten=${input.forgotten}`,
    `archived=${input.archived}`,
  ].join("; ");

  return Object.freeze({
    ...input,
    categoryCounts: Object.freeze({ ...input.categoryCounts }),
    summary,
  });
}
