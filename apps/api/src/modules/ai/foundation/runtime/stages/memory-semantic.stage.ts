import type { AiPipelineStage } from "./stage.js";
import {
  isAiMemoryEmbeddingsEnabled,
  isAiMemoryRelationshipsEnabled,
  isAiMemorySimilaritySearchEnabled,
  isAiSemanticMemoryEnabled,
} from "../../feature-flags.js";
import { resolveSemanticMemory } from "../../memory/semantic/semantic-memory-engine.js";
import { emptySemanticMemoryResult } from "../../memory/semantic/semantic-memory-result.js";
import { buildSemanticMemoryQuery } from "../../memory/semantic/semantic-memory-query.js";

/**
 * Memory Semantic Stage.
 * Builds semantic index, optional embeddings/similarity, and related memories
 * after Retrieval and before Knowledge / Long-Term.
 * Complete no-op when AI_SEMANTIC_MEMORY=false.
 */
export const memorySemanticStage: AiPipelineStage = {
  name: "memory-semantic",
  async run(state) {
    if (!isAiSemanticMemoryEnabled()) {
      return {
        ...state,
        semanticMemory: undefined,
        relatedMemories: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        semanticMemory: Object.freeze({
          query: buildSemanticMemoryQuery({ text: "" }),
          result: emptySemanticMemoryResult(
            "Semantic memory withheld in privacy mode.",
          ),
          embeddingsBuilt: false,
          similarityEnabled: false,
          relationshipsEnabled: false,
          notes: Object.freeze(["privacy-mode"]),
        }),
        relatedMemories: Object.freeze([]),
      };
    }

    const sourceEntries =
      state.memoryRanking?.rankedEntries ?? state.memoryEntries ?? [];

    const semanticMemory = resolveSemanticMemory({
      entries: sourceEntries,
      userPrompt: state.prompt,
      mode: state.mode ?? state.activeContext.mode,
      moduleHint: state.activeContext.module,
      embeddingsEnabled: isAiMemoryEmbeddingsEnabled(),
      similarityEnabled: isAiMemorySimilaritySearchEnabled(),
      relationshipsEnabled: isAiMemoryRelationshipsEnabled(),
    });

    const relatedMemories = Object.freeze(
      semanticMemory.result.related.map((r) => r.entry),
    );

    return {
      ...state,
      semanticMemory,
      relatedMemories,
    };
  },
};
