/**
 * Cosine similarity and related scoring helpers.
 */

export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[],
): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return Math.max(-1, Math.min(1, dot / denom));
}

export function clampSimilarity(score: number): number {
  return Math.max(0, Math.min(1, (score + 1) / 2));
}
