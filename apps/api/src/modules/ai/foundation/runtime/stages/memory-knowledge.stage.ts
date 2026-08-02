import type { AiPipelineStage } from "./stage.js";
import {
  isAiMemoryKnowledgeGraphEnabled,
  isAiMemoryRelationshipsEnabled,
  isAiSemanticMemoryEnabled,
} from "../../feature-flags.js";
import { buildKnowledgeMemory } from "../../memory/semantic/knowledge-graph.js";
import { buildMemoryRelations } from "../../memory/semantic/memory-linking.js";

/**
 * Memory Knowledge Stage.
 * Builds runtime knowledge graph summary after Semantic and before Context.
 * Complete no-op when AI_SEMANTIC_MEMORY=false or AI_MEMORY_KNOWLEDGE_GRAPH=false.
 */
export const memoryKnowledgeStage: AiPipelineStage = {
  name: "memory-knowledge",
  async run(state) {
    if (
      !isAiSemanticMemoryEnabled() ||
      !isAiMemoryKnowledgeGraphEnabled()
    ) {
      return {
        ...state,
        knowledgeMemory: undefined,
        knowledgeGraphSummary: undefined,
      };
    }

    if (state.policy.privacyMode) {
      const emptySummary = Object.freeze({
        nodeCount: 0,
        edgeCount: 0,
        topics: Object.freeze([] as string[]),
        relatedTopics: Object.freeze([] as string[]),
        retrievedContext: Object.freeze([] as string[]),
        confidence: 0,
        summary: "Knowledge graph withheld in privacy mode.",
      });
      return {
        ...state,
        knowledgeMemory: Object.freeze({
          graph: Object.freeze({
            nodes: Object.freeze([]),
            edges: Object.freeze([]),
            topics: Object.freeze([]),
            confidence: 0,
          }),
          summary: emptySummary,
          relatedMemoryIds: Object.freeze([]),
          notes: Object.freeze(["privacy-mode"]),
        }),
        knowledgeGraphSummary: emptySummary,
      };
    }

    const entries =
      state.semanticMemory?.result.items.map((i) => i.entry) ??
      state.memoryRanking?.rankedEntries ??
      state.memoryEntries ??
      [];

    const relations = isAiMemoryRelationshipsEnabled()
      ? buildMemoryRelations({
          entries,
          similarityHits: state.semanticMemory?.result.similarityHits,
          moduleHint: state.activeContext.module,
        })
      : Object.freeze([]);

    const knowledgeMemory = buildKnowledgeMemory({
      entries,
      relations,
      moduleHint: state.activeContext.module,
      conversationId: state.activeContext.conversationId,
      userId: state.userId ?? state.activeContext.user?.userId ?? null,
    });

    return {
      ...state,
      knowledgeMemory,
      knowledgeGraphSummary: knowledgeMemory.summary,
    };
  },
};
