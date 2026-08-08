/**
 * Top-K similarity search over memory embeddings.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import type { AiMemoryEmbedding } from "./memory-embedding.js";
import { clampSimilarity, cosineSimilarity } from "./memory-similarity.js";
import { aiDataPolicyService } from "../../policy/ai-data-policy.service.js";
import { freezeMemoryEntry } from "../memory-entry.js";

export interface SimilarityHit {
  readonly entry: AiMemoryEntry;
  readonly score: number;
  readonly confidence: number;
}

export interface SimilaritySearchInput {
  readonly queryVector: readonly number[];
  readonly entries: readonly AiMemoryEntry[];
  readonly embeddings: ReadonlyMap<string, AiMemoryEmbedding>;
  readonly topK?: number;
  readonly threshold?: number;
  readonly role?: string | null;
  readonly permissions?: readonly string[] | null;
  readonly userId?: string | null;
  readonly explicitRestrictedAccess?: boolean;
}

export interface SimilaritySearchResult {
  readonly hits: readonly SimilarityHit[];
  readonly topK: number;
  readonly threshold: number;
  readonly confidence: number;
}

export function searchSimilarMemories(
  input: SimilaritySearchInput,
): SimilaritySearchResult {
  const topK = Math.max(1, Math.min(20, input.topK ?? 5));
  const threshold = Math.max(0, Math.min(1, input.threshold ?? 0.35));

  const scored: SimilarityHit[] = [];
  for (const entry of input.entries) {
    const embedding = input.embeddings.get(entry.id);
    if (!embedding) continue;
    const raw = cosineSimilarity(input.queryVector, embedding.vector);
    const score = clampSimilarity(raw);
    if (score < threshold) continue;
    scored.push(
      Object.freeze({
        entry,
        score: Math.round(score * 1000) / 1000,
        confidence: Math.round(score * 1000) / 1000,
      }),
    );
  }

  scored.sort((a, b) => b.score - a.score);
  const topHits = scored.slice(0, topK);

  const policySubject = aiDataPolicyService.subjectFrom({
    userId: input.userId,
    role: input.role,
    permissions: input.permissions,
    explicitRestrictedAccess: input.explicitRestrictedAccess === true,
  });

  const hits = Object.freeze(
    topHits.map((hit) => {
      const [scrubbed] = aiDataPolicyService.sanitizeSearchResults(
        [hit.entry],
        policySubject,
      );
      return Object.freeze({
        ...hit,
        entry: scrubbed ? freezeMemoryEntry(scrubbed) : hit.entry,
      });
    }),
  );
  const confidence =
    hits.length === 0
      ? 0
      : Math.round(
          (hits.reduce((sum, h) => sum + h.confidence, 0) / hits.length) * 1000,
        ) / 1000;

  return Object.freeze({
    hits,
    topK,
    threshold,
    confidence,
  });
}
