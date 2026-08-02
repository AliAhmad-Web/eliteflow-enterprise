/**
 * Memory aging — decay strength/relevance over relative age.
 */

export interface AiMemoryAgingResult {
  readonly ageFactor: number;
  readonly decayedStrength: number;
  readonly decayedRelevance: number;
}

/**
 * Age factor from recency (1 = newest, ~0 = oldest).
 * When aging disabled, returns identity (no decay).
 */
export function applyMemoryAging(input: {
  readonly recency: number;
  readonly strength: number;
  readonly relevance: number;
  readonly agingEnabled: boolean;
}): AiMemoryAgingResult {
  if (!input.agingEnabled) {
    return Object.freeze({
      ageFactor: 1,
      decayedStrength: input.strength,
      decayedRelevance: input.relevance,
    });
  }

  const ageFactor = Math.max(0.2, Math.min(1, 0.35 + input.recency * 0.65));
  return Object.freeze({
    ageFactor: Math.round(ageFactor * 1000) / 1000,
    decayedStrength:
      Math.round(input.strength * ageFactor * 1000) / 1000,
    decayedRelevance:
      Math.round(input.relevance * (0.5 + ageFactor * 0.5) * 1000) / 1000,
  });
}
