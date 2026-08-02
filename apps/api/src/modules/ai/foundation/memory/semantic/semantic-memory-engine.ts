/**
 * Semantic Memory Engine — indexing, embeddings, similarity, clustering, relations.
 * Runtime-only. Never exposes raw embeddings. Never calls external APIs by default.
 */

import { sanitizeMemoryText, type AiMemoryEntry } from "../memory-entry.js";
import { enterpriseEmbeddingRegistry } from "./embedding-registry.js";
import type { AiMemoryEmbedding } from "./memory-embedding.js";
import {
  buildMemoryRelations,
  linkRelatedMemories,
} from "./memory-linking.js";
import type { AiMemoryRelation } from "./memory-relations.js";
import type { AiSemanticMemory } from "./semantic-memory.js";
import {
  freezeSemanticMemoryEntry,
  type AiSemanticMemoryEntry,
} from "./semantic-memory-entry.js";
import {
  buildSemanticMemoryQuery,
  type AiSemanticMemoryQuery,
} from "./semantic-memory-query.js";
import {
  emptySemanticMemoryResult,
  type AiSemanticMemoryResult,
} from "./semantic-memory-result.js";
import { searchSimilarMemories } from "./similarity-search.js";

export interface ResolveSemanticMemoryInput {
  readonly entries: readonly AiMemoryEntry[];
  readonly userPrompt?: string | null;
  readonly mode?: string | null;
  readonly moduleHint?: string | null;
  readonly embeddingsEnabled: boolean;
  readonly similarityEnabled: boolean;
  readonly relationshipsEnabled: boolean;
}

function extractTopics(entry: AiMemoryEntry): readonly string[] {
  const fromTags = entry.tags.slice(0, 4);
  const tokens = entry.summary
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length >= 4)
    .slice(0, 3);
  return Object.freeze([...new Set([...fromTags, ...tokens])].slice(0, 5));
}

function detectDuplicates(
  entries: readonly AiMemoryEntry[],
): ReadonlySet<string> {
  const dupes = new Set<string>();
  for (let i = 0; i < entries.length; i += 1) {
    const a = entries[i];
    if (!a) continue;
    for (let j = i + 1; j < entries.length; j += 1) {
      const b = entries[j];
      if (!b) continue;
      const sa = a.summary.toLowerCase();
      const sb = b.summary.toLowerCase();
      if (sa === sb || (sa.length > 24 && sb.includes(sa.slice(0, 24)))) {
        dupes.add(b.id);
      }
    }
  }
  return dupes;
}

function clusterIdFor(entry: AiMemoryEntry, topics: readonly string[]): string {
  const key = topics[0] ?? entry.type;
  return `cluster:${key.toLowerCase()}`;
}

function buildEmbeddings(
  entries: readonly AiMemoryEntry[],
  queryText: string,
): {
  readonly byId: Map<string, AiMemoryEmbedding>;
  readonly queryVector: readonly number[];
} {
  const provider = enterpriseEmbeddingRegistry.getDefault();
  const byId = new Map<string, AiMemoryEmbedding>();
  for (const entry of entries) {
    const emb = provider.embed({
      id: entry.id,
      text: `${entry.summary} ${entry.tags.join(" ")} ${entry.type}`,
    });
    byId.set(entry.id, emb);
  }
  const query = provider.embed({
    id: "query",
    text: queryText || "memory",
  });
  return { byId, queryVector: query.vector };
}

/**
 * Resolve immutable semantic memory from retrieved/ranked entries.
 */
export function resolveSemanticMemory(
  input: ResolveSemanticMemoryInput,
): AiSemanticMemory {
  const query: AiSemanticMemoryQuery = buildSemanticMemoryQuery({
    text: input.userPrompt,
    mode: input.mode,
    moduleHint: input.moduleHint,
  });

  const entries = input.entries.slice(0, 24);
  if (entries.length === 0) {
    return Object.freeze({
      query,
      result: emptySemanticMemoryResult("No memories available for semantic retrieval."),
      embeddingsBuilt: false,
      similarityEnabled: input.similarityEnabled,
      relationshipsEnabled: input.relationshipsEnabled,
      notes: Object.freeze(["empty"]),
    });
  }

  const duplicates = detectDuplicates(entries);
  let similarityHits = Object.freeze(
    [] as ReturnType<typeof searchSimilarMemories>["hits"],
  );
  let embeddingsBuilt = false;

  if (input.embeddingsEnabled) {
    const { byId, queryVector } = buildEmbeddings(entries, query.text);
    embeddingsBuilt = true;
    if (input.similarityEnabled) {
      const search = searchSimilarMemories({
        queryVector,
        entries,
        embeddings: byId,
        topK: query.topK,
        threshold: query.threshold,
      });
      similarityHits = search.hits;
    }
  }

  const relations: readonly AiMemoryRelation[] = input.relationshipsEnabled
    ? buildMemoryRelations({
        entries,
        similarityHits,
        moduleHint: input.moduleHint,
      })
    : Object.freeze([]);

  const seedIds =
    similarityHits.length > 0
      ? similarityHits.map((h) => h.entry.id)
      : entries.slice(0, 3).map((e) => e.id);

  const relatedEntries = input.relationshipsEnabled
    ? linkRelatedMemories({
        entries,
        relations,
        seedIds,
        maxRelated: 6,
      })
    : Object.freeze([]);

  const scoreById = new Map(
    similarityHits.map((h) => [h.entry.id, h.score] as const),
  );

  const items: AiSemanticMemoryEntry[] = entries.map((entry) => {
    const topics = extractTopics(entry);
    return freezeSemanticMemoryEntry({
      entry,
      semanticScore: scoreById.get(entry.id) ?? entry.recency * 0.5,
      clusterId: clusterIdFor(entry, topics),
      isDuplicate: duplicates.has(entry.id),
      topics,
    });
  });

  items.sort((a, b) => b.semanticScore - a.semanticScore);

  const related: AiSemanticMemoryEntry[] = relatedEntries.map((entry) => {
    const topics = extractTopics(entry);
    return freezeSemanticMemoryEntry({
      entry,
      semanticScore: scoreById.get(entry.id) ?? 0.4,
      clusterId: clusterIdFor(entry, topics),
      isDuplicate: duplicates.has(entry.id),
      topics,
    });
  });

  const clusters = new Set(items.map((i) => i.clusterId).filter(Boolean));
  const confidence =
    items.length === 0
      ? 0
      : Math.round(
          (items
            .slice(0, query.topK)
            .reduce((s, i) => s + i.semanticScore, 0) /
            Math.min(items.length, query.topK)) *
            1000,
        ) / 1000;

  const result: AiSemanticMemoryResult = Object.freeze({
    items: Object.freeze(items.slice(0, 12)),
    related: Object.freeze(related.slice(0, 6)),
    similarityHits,
    confidence,
    duplicateCount: duplicates.size,
    clusterCount: clusters.size,
    summary: sanitizeMemoryText(
      `Semantic recall ${Math.min(items.length, query.topK)} memories; clusters=${clusters.size}; related=${related.length}`,
      200,
    ),
  });

  return Object.freeze({
    query,
    result,
    embeddingsBuilt,
    similarityEnabled: input.similarityEnabled,
    relationshipsEnabled: input.relationshipsEnabled,
    notes: Object.freeze([
      `items:${result.items.length}`,
      embeddingsBuilt ? "embeddings:on" : "embeddings:off",
      input.similarityEnabled ? "similarity:on" : "similarity:off",
      input.relationshipsEnabled ? "relations:on" : "relations:off",
    ]),
  });
}

export const semanticMemoryEngine = Object.freeze({
  resolve: resolveSemanticMemory,
});
