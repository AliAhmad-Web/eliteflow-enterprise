import type { AiPipelineStage } from "./stage.js";
import {
  isAiLongTermMemoryEnabled,
  isAiMemoryAgingEnabled,
  isAiMemoryForgettingEnabled,
  isAiMemoryRetentionEnabled,
} from "../../feature-flags.js";
import { resolveLongTermMemory } from "../../memory/long-term/long-term-memory-engine.js";
import {
  buildLongTermMemoryProfile,
  emptyCategoryCounts,
} from "../../memory/long-term/long-term-memory-profile.js";

/**
 * Memory Long-Term Stage.
 * Scores importance/strength/relevance and applies retention/aging/forgetting.
 * After Knowledge and before Ranking / Context / Consolidation.
 * Complete no-op when AI_LONG_TERM_MEMORY=false.
 */
export const memoryLongTermStage: AiPipelineStage = {
  name: "memory-long-term",
  async run(state) {
    if (!isAiLongTermMemoryEnabled()) {
      return {
        ...state,
        longTermMemory: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        longTermMemory: Object.freeze({
          entries: Object.freeze([]),
          activeEntries: Object.freeze([]),
          profile: buildLongTermMemoryProfile({
            total: 0,
            promoted: 0,
            demoted: 0,
            forgotten: 0,
            archived: 0,
            averageImportance: 0,
            averageStrength: 0,
            categoryCounts: emptyCategoryCounts(),
          }),
          retentionApplied: false,
          agingApplied: false,
          forgettingApplied: false,
          confidence: 0,
          notes: Object.freeze(["privacy-mode"]),
        }),
      };
    }

    const sourceEntries =
      state.semanticMemory?.result.items.map((i) => i.entry) ??
      state.memoryRanking?.rankedEntries ??
      state.memoryEntries ??
      [];

    const semanticScores = new Map<string, number>();
    for (const item of state.semanticMemory?.result.items ?? []) {
      semanticScores.set(item.entry.id, item.semanticScore);
    }

    const longTermMemory = resolveLongTermMemory({
      entries: sourceEntries,
      userPrompt: state.prompt,
      moduleHint: state.activeContext.module,
      semanticScores,
      retentionEnabled: isAiMemoryRetentionEnabled(),
      agingEnabled: isAiMemoryAgingEnabled(),
      forgettingEnabled: isAiMemoryForgettingEnabled(),
    });

    return {
      ...state,
      longTermMemory,
    };
  },
};
