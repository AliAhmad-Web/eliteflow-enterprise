/**
 * Business Query confidence helpers.
 */

export function clampBusinessQueryConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.4;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

export function scoreBusinessQueryConfidence(input: {
  readonly hasIntent: boolean;
  readonly hasEntity: boolean;
  readonly filterCount: number;
  readonly hasModule: boolean;
}): number {
  let score = 0.35;
  if (input.hasIntent) score += 0.2;
  if (input.hasEntity) score += 0.25;
  if (input.hasModule) score += 0.1;
  if (input.filterCount > 0) {
    score += Math.min(0.15, input.filterCount * 0.05);
  }
  return clampBusinessQueryConfidence(score);
}
