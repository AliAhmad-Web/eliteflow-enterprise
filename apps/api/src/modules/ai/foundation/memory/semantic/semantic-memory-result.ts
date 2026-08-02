/**
 * Semantic memory search result contract.
 */

import type { AiSemanticMemoryEntry } from "./semantic-memory-entry.js";
import type { SimilarityHit } from "./similarity-search.js";

export interface AiSemanticMemoryResult {
  readonly items: readonly AiSemanticMemoryEntry[];
  readonly related: readonly AiSemanticMemoryEntry[];
  readonly similarityHits: readonly SimilarityHit[];
  readonly confidence: number;
  readonly duplicateCount: number;
  readonly clusterCount: number;
  readonly summary: string;
}

export function emptySemanticMemoryResult(
  summary = "No semantic memory.",
): AiSemanticMemoryResult {
  return Object.freeze({
    items: Object.freeze([]),
    related: Object.freeze([]),
    similarityHits: Object.freeze([]),
    confidence: 0,
    duplicateCount: 0,
    clusterCount: 0,
    summary,
  });
}
