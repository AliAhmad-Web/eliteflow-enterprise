import type { AiPipelineStage } from "./stage.js";
import {
  isAiMemorySaveEnabled,
  isAiPersistentMemoryEnabled,
} from "../../feature-flags.js";
import { savePersistentMemory } from "../../memory/persistence/memory-saver.js";

/**
 * Memory Save Stage.
 * Batched / background persistence after Response. Never blocks on failure.
 * Complete no-op when AI_PERSISTENT_MEMORY or AI_MEMORY_SAVE is false.
 */
export const memorySaveStage: AiPipelineStage = {
  name: "memory-save",
  async run(state) {
    if (!isAiPersistentMemoryEnabled() || !isAiMemorySaveEnabled()) {
      return {
        ...state,
        savedMemory: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        savedMemory: Object.freeze({
          savedCount: 0,
          memoryKeys: Object.freeze([]),
          deferred: false,
          cleanedUp: false,
          savedAt: new Date().toISOString(),
          summary: "Memory save withheld in privacy mode.",
        }),
      };
    }

    const userId = state.userId?.trim() || state.activeContext.user?.userId;
    if (!userId) {
      return {
        ...state,
        savedMemory: Object.freeze({
          savedCount: 0,
          memoryKeys: Object.freeze([]),
          deferred: false,
          cleanedUp: false,
          savedAt: new Date().toISOString(),
          summary: "Memory save skipped (no user).",
        }),
      };
    }

    const entries = [
      ...(state.memoryEntries ?? []),
      ...(state.memoryContext?.entries ?? []),
      ...(state.loadedMemory?.entries ?? []),
    ];

    // Prefer ranked entries when available.
    const ranked = state.memoryRanking?.rankedEntries;
    const toSave = ranked && ranked.length > 0 ? ranked : entries;

    const savedMemory = await savePersistentMemory({
      userId,
      conversationId:
        state.activeContext.conversationId ??
        state.contextHints?.conversationId,
      privacyMode: false,
      entries: toSave,
      background: true,
      runCleanup: true,
    });

    return {
      ...state,
      savedMemory,
    };
  },
};
