/**
 * Embedding provider abstraction.
 * Local deterministic lexical embeddings by default — no external API calls.
 */

import {
  freezeMemoryEmbedding,
  type AiMemoryEmbedding,
} from "./memory-embedding.js";

export interface EmbedTextInput {
  readonly id: string;
  readonly text: string;
}

export interface AiEmbeddingProvider {
  readonly id: string;
  readonly dimensions: number;
  embed(input: EmbedTextInput): AiMemoryEmbedding;
  embedMany(inputs: readonly EmbedTextInput[]): readonly AiMemoryEmbedding[];
}

const DEFAULT_DIMENSIONS = 64;

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function tokenize(text: string): readonly string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length >= 2)
    .slice(0, 48);
}

/**
 * Deterministic bag-of-tokens embedding into a fixed-size vector.
 */
export function createLocalLexicalEmbeddingProvider(
  dimensions = DEFAULT_DIMENSIONS,
): AiEmbeddingProvider {
  const dims = Math.max(8, Math.min(256, dimensions));

  const embed = (input: EmbedTextInput): AiMemoryEmbedding => {
    const vector = new Array<number>(dims).fill(0);
    const tokens = tokenize(input.text);
    for (const token of tokens) {
      const idx = hashToken(token) % dims;
      vector[idx] = (vector[idx] ?? 0) + 1;
    }
    // L2 normalize
    let norm = 0;
    for (const v of vector) norm += v * v;
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < vector.length; i += 1) {
      vector[i] = (vector[i] ?? 0) / norm;
    }
    return freezeMemoryEmbedding({
      entryId: input.id,
      dimensions: dims,
      providerId: "local-lexical",
      vector,
    });
  };

  return Object.freeze({
    id: "local-lexical",
    dimensions: dims,
    embed,
    embedMany(inputs: readonly EmbedTextInput[]): readonly AiMemoryEmbedding[] {
      return Object.freeze(inputs.map(embed));
    },
  });
}

export const defaultEmbeddingProvider = createLocalLexicalEmbeddingProvider();
