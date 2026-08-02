/**
 * Business reasoning confidence helpers.
 */

export function clampBusinessReasoningConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.35;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

export function scoreBusinessReasoningConfidence(input: {
  readonly okModuleCount: number;
  readonly summaryItemCount: number;
  readonly insightCount: number;
  readonly riskCount: number;
  readonly hasBusinessQuery: boolean;
}): number {
  let score = 0.3;
  if (input.okModuleCount > 0) {
    score += Math.min(0.25, input.okModuleCount * 0.06);
  }
  if (input.summaryItemCount > 0) {
    score += Math.min(0.2, input.summaryItemCount * 0.04);
  }
  if (input.insightCount > 0) score += 0.08;
  if (input.riskCount > 0) score += 0.07;
  if (input.hasBusinessQuery) score += 0.05;
  return clampBusinessReasoningConfidence(score);
}
