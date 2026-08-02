import type { AiPipelineStage } from "./stage.js";
import {
  isAiLongTermMemoryEnabled,
  isAiMemoryConsolidationEnabled,
} from "../../feature-flags.js";
import { consolidateLongTermMemories } from "../../memory/long-term/long-term-memory-consolidation.js";

/**
 * Memory Consolidation Stage.
 * Merges duplicates/similar memories, promotes important ones, archives low-value.
 * After Memory Context and before Memory Platform finalize.
 * Complete no-op when AI_LONG_TERM_MEMORY or AI_MEMORY_CONSOLIDATION is false.
 */
export const memoryConsolidationStage: AiPipelineStage = {
  name: "memory-consolidation",
  async run(state) {
    if (
      !isAiLongTermMemoryEnabled() ||
      !isAiMemoryConsolidationEnabled()
    ) {
      return {
        ...state,
        memoryConsolidation: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        memoryConsolidation: Object.freeze({
          items: Object.freeze([]),
          consolidatedEntries: Object.freeze([]),
          mergedCount: 0,
          archivedCount: 0,
          promotedCount: 0,
          preservedPreferences: 0,
          preservedBusiness: 0,
          summary: "Memory consolidation withheld in privacy mode.",
          confidence: 0,
        }),
      };
    }

    const longTermEntries = state.longTermMemory?.entries ?? [];
    const memoryConsolidation = consolidateLongTermMemories({
      longTermEntries,
    });

    return {
      ...state,
      memoryConsolidation,
    };
  },
};
