/**
 * Memory embedding vector contract.
 * Runtime-only — never persisted as raw vectors in prompts.
 */

export interface AiMemoryEmbedding {
  readonly entryId: string;
  readonly dimensions: number;
  readonly providerId: string;
  /** Dense vector — never exposed to prompts. */
  readonly vector: readonly number[];
}

export function freezeMemoryEmbedding(
  embedding: AiMemoryEmbedding,
): AiMemoryEmbedding {
  return Object.freeze({
    ...embedding,
    vector: Object.freeze([...embedding.vector]),
  });
}
