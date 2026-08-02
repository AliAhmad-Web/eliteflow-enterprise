import type { AiPipelineStage } from "./stage.js";
import {
  isAiEpisodicMemoryEnabled,
  isAiMemoryEpisodesEnabled,
} from "../../feature-flags.js";
import { resolveEpisodicMemory } from "../../memory/episodic/episodic-memory-engine.js";
import { buildEpisodicTimeline } from "../../memory/episodic/episodic-memory-timeline.js";

/**
 * Memory Episodic Stage.
 * Builds conversation/business episodes and timeline after Working Memory
 * and before Retrieval. Complete no-op when AI_EPISODIC_MEMORY=false.
 */
export const memoryEpisodicStage: AiPipelineStage = {
  name: "memory-episodic",
  async run(state) {
    if (!isAiEpisodicMemoryEnabled()) {
      return {
        ...state,
        episodicMemory: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        episodicMemory: Object.freeze({
          entries: Object.freeze([]),
          episodes: Object.freeze([]),
          timeline: buildEpisodicTimeline([]),
          links: Object.freeze([]),
          episodesEnabled: false,
          confidence: 0,
          summary: "Episodic memory withheld in privacy mode.",
          notes: Object.freeze(["privacy-mode"]),
        }),
      };
    }

    const episodicMemory = resolveEpisodicMemory({
      conversationHistory: state.conversationHistory,
      memoryEntries: state.memoryEntries,
      workingMemory: state.workingMemory,
      userPrompt: state.prompt,
      moduleHint: state.activeContext.module,
      episodesEnabled: isAiMemoryEpisodesEnabled(),
    });

    return {
      ...state,
      episodicMemory,
    };
  },
};
