/**
 * Relevance calculation for long-term memories vs current request.
 */

import type { AiMemoryEntry } from "../memory-entry.js";

function tokenize(text: string): readonly string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length >= 3)
    .slice(0, 24);
}

export function scoreMemoryRelevance(input: {
  readonly entry: AiMemoryEntry;
  readonly userPrompt?: string | null;
  readonly moduleHint?: string | null;
  readonly semanticScore?: number;
}): number {
  const promptTokens = tokenize(input.userPrompt ?? "");
  const hay = `${input.entry.summary} ${input.entry.tags.join(" ")}`.toLowerCase();
  let overlap = 0;
  if (promptTokens.length > 0) {
    const hits = promptTokens.filter((t) => hay.includes(t)).length;
    overlap = hits / promptTokens.length;
  }

  const moduleBoost =
    input.moduleHint &&
    hay.includes(input.moduleHint.toLowerCase())
      ? 0.15
      : 0;

  const semantic = input.semanticScore ?? 0.35;
  const score = overlap * 0.45 + semantic * 0.4 + input.entry.recency * 0.15 + moduleBoost;
  return Math.min(1, Math.round(score * 1000) / 1000);
}
