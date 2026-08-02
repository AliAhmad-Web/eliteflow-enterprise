/**
 * Memory analytics metrics.
 */

export interface AiMemoryAnalytics {
  readonly entryCount: number;
  readonly loadedCount: number;
  readonly workingCount: number;
  readonly episodicCount: number;
  readonly semanticHitCount: number;
  readonly longTermActiveCount: number;
  readonly consolidatedCount: number;
  readonly averageConfidence: number;
  readonly summary: string;
}

export function buildMemoryAnalytics(input: {
  readonly entryCount: number;
  readonly loadedCount: number;
  readonly workingCount: number;
  readonly episodicCount: number;
  readonly semanticHitCount: number;
  readonly longTermActiveCount: number;
  readonly consolidatedCount: number;
  readonly confidences: readonly number[];
}): AiMemoryAnalytics {
  const averageConfidence =
    input.confidences.length === 0
      ? 0
      : Math.round(
          (input.confidences.reduce((s, c) => s + c, 0) /
            input.confidences.length) *
            1000,
        ) / 1000;

  return Object.freeze({
    entryCount: input.entryCount,
    loadedCount: input.loadedCount,
    workingCount: input.workingCount,
    episodicCount: input.episodicCount,
    semanticHitCount: input.semanticHitCount,
    longTermActiveCount: input.longTermActiveCount,
    consolidatedCount: input.consolidatedCount,
    averageConfidence,
    summary: `Analytics entries=${input.entryCount}; confidence=${averageConfidence.toFixed(2)}`,
  });
}
