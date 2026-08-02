import type { AiPipelineStage } from "./stage.js";
import {
  isAiMemoryFrameworkEnabled,
  isAiMemoryRankingEnabled,
} from "../../feature-flags.js";
import { rankMemoryEntries } from "../../memory/memory-ranking.js";

/**
 * Memory Ranking Stage.
 * Scores and orders retrieved memory entries after Long-Term and before Memory Context.
 * Skipped when AI_MEMORY_FRAMEWORK or AI_MEMORY_RANKING is false (complete no-op).
 */
export const memoryRankingStage: AiPipelineStage = {
  name: "memory-ranking",
  async run(state) {
    if (!isAiMemoryFrameworkEnabled() || !isAiMemoryRankingEnabled()) {
      return {
        ...state,
        memoryRanking: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        memoryRanking: Object.freeze({
          items: Object.freeze([]),
          rankedEntries: Object.freeze([]),
          confidence: 0,
          summary: "Memory ranking withheld in privacy mode.",
        }),
      };
    }

    const entries = state.memoryEntries ?? [];
    const memoryRanking = rankMemoryEntries({
      entries,
      userPrompt: state.prompt,
      mode: state.mode ?? state.activeContext.mode,
      maxItems: 12,
    });

    return {
      ...state,
      memoryRanking,
    };
  },
};
