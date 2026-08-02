/**
 * Long-Term Memory Engine — importance, promotion, demotion, retention, aging, forgetting.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import { applyMemoryAging } from "./long-term-memory-aging.js";
import { resolveLongTermMemoryCategory } from "./long-term-memory-category.js";
import { decideMemoryDemotion } from "./long-term-memory-demotion.js";
import {
  freezeLongTermMemoryEntry,
  type AiLongTermMemoryEntry,
} from "./long-term-memory-entry.js";
import { decideMemoryForgetting } from "./long-term-memory-forgetting.js";
import { scoreMemoryImportance } from "./long-term-memory-importance.js";
import {
  resolveLifecycleState,
} from "./long-term-memory-lifecycle.js";
import type { AiLongTermMemory } from "./long-term-memory.js";
import {
  buildLongTermMemoryProfile,
  emptyCategoryCounts,
} from "./long-term-memory-profile.js";
import { resolveLongTermMemoryPriority } from "./long-term-memory-priority.js";
import { decideMemoryPromotion } from "./long-term-memory-promotion.js";
import { scoreMemoryRelevance } from "./long-term-memory-relevance.js";
import { resolveMemoryRetentionPolicy } from "./long-term-memory-retention.js";
import { scoreMemoryStrength } from "./long-term-memory-strength.js";

export interface ResolveLongTermMemoryInput {
  readonly entries: readonly AiMemoryEntry[];
  readonly userPrompt?: string | null;
  readonly moduleHint?: string | null;
  readonly semanticScores?: ReadonlyMap<string, number>;
  readonly retentionEnabled: boolean;
  readonly agingEnabled: boolean;
  readonly forgettingEnabled: boolean;
}

/**
 * Evaluate memories for long-term intelligence scoring and lifecycle.
 */
export function resolveLongTermMemory(
  input: ResolveLongTermMemoryInput,
): AiLongTermMemory {
  const evaluated: AiLongTermMemoryEntry[] = [];
  const categoryCounts = emptyCategoryCounts();

  for (const entry of input.entries.slice(0, 32)) {
    const category = resolveLongTermMemoryCategory({
      type: entry.type,
      tags: entry.tags,
    });
    categoryCounts[category] += 1;

    const semanticScore = input.semanticScores?.get(entry.id);
    const importance = scoreMemoryImportance({
      entry,
      category,
      semanticScore,
    });
    const relevance = scoreMemoryRelevance({
      entry,
      userPrompt: input.userPrompt,
      moduleHint: input.moduleHint,
      semanticScore,
    });
    let strength = scoreMemoryStrength({
      importance,
      relevance,
      recency: entry.recency,
      category,
      reinforced: entry.type === "longterm" || entry.type === "preference",
    });

    const aging = applyMemoryAging({
      recency: entry.recency,
      strength,
      relevance,
      agingEnabled: input.agingEnabled,
    });
    strength = aging.decayedStrength;
    const agedRelevance = aging.decayedRelevance;

    const retention = resolveMemoryRetentionPolicy({
      category,
      importance,
      retentionEnabled: input.retentionEnabled,
    });

    const promotion = decideMemoryPromotion({
      importance,
      strength,
      category,
    });
    const demotion = decideMemoryDemotion({
      importance,
      strength,
      relevance: agedRelevance,
      category,
      promoted: promotion.promote,
    });
    const forgetting = decideMemoryForgetting({
      forgettingEnabled: input.forgettingEnabled,
      importance,
      strength,
      demoted: demotion.demote,
      category,
      retention,
    });

    const archived =
      !forgetting.forget &&
      (demotion.demote || resolveLongTermMemoryPriority({
        importance,
        strength,
        category,
      }) === "archive");

    const longTermPriority = resolveLongTermMemoryPriority({
      importance,
      strength,
      category,
    });

    const lifecycle = resolveLifecycleState({
      promoted: promotion.promote && !demotion.demote,
      demoted: demotion.demote,
      forgotten: forgetting.forget,
      archived,
    });

    evaluated.push(
      freezeLongTermMemoryEntry({
        entry,
        category,
        longTermPriority,
        importance,
        relevance: agedRelevance,
        strength,
        ageFactor: aging.ageFactor,
        retention,
        lifecycle,
        promoted: promotion.promote && !demotion.demote,
        demoted: demotion.demote,
        forgotten: forgetting.forget,
        archived,
        notes: Object.freeze([
          promotion.reason,
          demotion.reason,
          forgetting.reason,
          `retention:${retention.kind}`,
        ]),
      }),
    );
  }

  evaluated.sort((a, b) => b.importance - a.importance || b.strength - a.strength);

  const activeEntries = Object.freeze(
    evaluated.filter((e) => !e.forgotten && !e.archived),
  );
  const promoted = evaluated.filter((e) => e.promoted).length;
  const demoted = evaluated.filter((e) => e.demoted).length;
  const forgotten = evaluated.filter((e) => e.forgotten).length;
  const archived = evaluated.filter((e) => e.archived).length;
  const averageImportance =
    evaluated.length === 0
      ? 0
      : evaluated.reduce((s, e) => s + e.importance, 0) / evaluated.length;
  const averageStrength =
    evaluated.length === 0
      ? 0
      : evaluated.reduce((s, e) => s + e.strength, 0) / evaluated.length;

  const profile = buildLongTermMemoryProfile({
    total: evaluated.length,
    promoted,
    demoted,
    forgotten,
    archived,
    averageImportance: Math.round(averageImportance * 1000) / 1000,
    averageStrength: Math.round(averageStrength * 1000) / 1000,
    categoryCounts,
  });

  const confidence =
    activeEntries.length === 0
      ? 0
      : Math.min(
          1,
          Math.round(
            (averageImportance * 0.5 + averageStrength * 0.5) * 1000,
          ) / 1000,
        );

  return Object.freeze({
    entries: Object.freeze(evaluated),
    activeEntries,
    profile,
    retentionApplied: input.retentionEnabled,
    agingApplied: input.agingEnabled,
    forgettingApplied: input.forgettingEnabled,
    confidence,
    notes: Object.freeze([
      `total:${evaluated.length}`,
      `active:${activeEntries.length}`,
      input.retentionEnabled ? "retention:on" : "retention:off",
      input.agingEnabled ? "aging:on" : "aging:off",
      input.forgettingEnabled ? "forgetting:on" : "forgetting:off",
    ]),
  });
}

export const longTermMemoryEngine = Object.freeze({
  resolve: resolveLongTermMemory,
});
