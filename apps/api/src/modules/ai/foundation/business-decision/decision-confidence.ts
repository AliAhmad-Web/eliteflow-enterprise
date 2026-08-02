/**
 * Business Decision confidence helpers.
 */

export function clampBusinessDecisionConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.35;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

export function scoreBusinessDecisionConfidence(input: {
  readonly hasReasoning: boolean;
  readonly reasoningConfidence: number;
  readonly optionCount: number;
  readonly riskCount: number;
  readonly recommendationCount: number;
  readonly hasBusinessQuery: boolean;
}): number {
  let score = 0.25;
  if (input.hasReasoning) {
    score += Math.min(0.35, Math.max(0, input.reasoningConfidence) * 0.4);
  }
  if (input.optionCount > 0) {
    score += Math.min(0.15, input.optionCount * 0.04);
  }
  if (input.riskCount > 0) score += 0.08;
  if (input.recommendationCount > 0) score += 0.08;
  if (input.hasBusinessQuery) score += 0.05;
  return clampBusinessDecisionConfidence(score);
}
