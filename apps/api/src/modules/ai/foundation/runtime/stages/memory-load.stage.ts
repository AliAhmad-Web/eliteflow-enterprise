import type { AiPipelineStage } from "./stage.js";
import {
  isAiMemoryCacheEnabled,
  isAiMemoryLoadEnabled,
  isAiMemorySearchEnabled,
  isAiPersistentMemoryEnabled,
} from "../../feature-flags.js";
import { loadPersistentMemory } from "../../memory/persistence/memory-loader.js";

/**
 * Memory Load Stage.
 * Lazy-loads persistent memory before Context. Permission-aware.
 * Complete no-op when AI_PERSISTENT_MEMORY or AI_MEMORY_LOAD is false.
 */
export const memoryLoadStage: AiPipelineStage = {
  name: "memory-load",
  async run(state) {
    if (!isAiPersistentMemoryEnabled() || !isAiMemoryLoadEnabled()) {
      return {
        ...state,
        loadedMemory: undefined,
        memoryPersistence: undefined,
      };
    }

    const userId = state.userId?.trim() || state.activeContext.user?.userId;
    if (!userId) {
      return {
        ...state,
        loadedMemory: Object.freeze({
          entries: Object.freeze([]),
          fromCache: false,
          searchUsed: false,
          loadedAt: new Date().toISOString(),
          entryCount: 0,
        }),
        memoryPersistence: Object.freeze({
          enabled: true,
          cacheEnabled: isAiMemoryCacheEnabled(),
          searchEnabled: isAiMemorySearchEnabled(),
          fromCache: false,
          searchUsed: false,
          indexSize: 0,
          notes: Object.freeze(["no-user"]),
        }),
      };
    }

    // Policy may still be placeholder before Policy Stage — honor privacy override if set.
    const privacyMode =
      state.policyOverrides?.privacyMode === true ||
      state.policy.privacyMode === true;

    const result = await loadPersistentMemory({
      userId,
      conversationId:
        state.contextHints?.conversationId ??
        state.activeContext.conversationId,
      privacyMode,
      permissions: state.contextHints?.permissions,
      userPrompt: state.prompt,
      useCache: isAiMemoryCacheEnabled(),
      enableSearch: isAiMemorySearchEnabled(),
    });

    return {
      ...state,
      loadedMemory: result.loadedMemory,
      memoryPersistence: result.memoryPersistence,
    };
  },
};
