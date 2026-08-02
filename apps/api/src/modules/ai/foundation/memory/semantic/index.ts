/**
 * Enterprise Semantic Memory public exports.
 */

export type { AiMemoryEmbedding } from "./memory-embedding.js";
export { freezeMemoryEmbedding } from "./memory-embedding.js";

export type { AiEmbeddingProvider, EmbedTextInput } from "./embedding-provider.js";
export {
  createLocalLexicalEmbeddingProvider,
  defaultEmbeddingProvider,
} from "./embedding-provider.js";

export {
  AiEmbeddingRegistry,
  enterpriseEmbeddingRegistry,
} from "./embedding-registry.js";

export {
  cosineSimilarity,
  clampSimilarity,
} from "./memory-similarity.js";

export type {
  SimilarityHit,
  SimilaritySearchInput,
  SimilaritySearchResult,
} from "./similarity-search.js";
export { searchSimilarMemories } from "./similarity-search.js";

export type { AiSemanticMemoryEntry } from "./semantic-memory-entry.js";
export { freezeSemanticMemoryEntry } from "./semantic-memory-entry.js";

export type { AiSemanticMemoryQuery } from "./semantic-memory-query.js";
export { buildSemanticMemoryQuery } from "./semantic-memory-query.js";

export type { AiSemanticMemoryResult } from "./semantic-memory-result.js";
export { emptySemanticMemoryResult } from "./semantic-memory-result.js";

export type { AiSemanticMemory } from "./semantic-memory.js";

export type {
  AiMemoryRelation,
  AiMemoryRelationKind,
} from "./memory-relations.js";
export {
  formatMemoryRelationKind,
  freezeMemoryRelation,
} from "./memory-relations.js";

export {
  buildMemoryRelations,
  linkRelatedMemories,
} from "./memory-linking.js";

export type {
  AiKnowledgeNode,
  AiKnowledgeNodeKind,
} from "./knowledge-node.js";
export {
  formatKnowledgeNodeKind,
  freezeKnowledgeNode,
} from "./knowledge-node.js";

export type {
  AiKnowledgeEdge,
  AiKnowledgeEdgeKind,
} from "./knowledge-edge.js";
export {
  formatKnowledgeEdgeKind,
  freezeKnowledgeEdge,
} from "./knowledge-edge.js";

export {
  traverseKnowledgeNeighbors,
  collectNodeLabels,
} from "./knowledge-traversal.js";

export type { RankedKnowledgeNode } from "./knowledge-ranking.js";
export { rankKnowledgeNodes } from "./knowledge-ranking.js";

export type {
  AiKnowledgeGraph,
  AiKnowledgeGraphSummary,
  AiKnowledgeMemory,
} from "./knowledge-graph.js";
export {
  buildKnowledgeGraph,
  summarizeKnowledgeGraph,
  buildKnowledgeMemory,
} from "./knowledge-graph.js";

export type { ResolveSemanticMemoryInput } from "./semantic-memory-engine.js";
export {
  resolveSemanticMemory,
  semanticMemoryEngine,
} from "./semantic-memory-engine.js";

export { formatSemanticKnowledgeForRuntime } from "./knowledge-runtime.js";
