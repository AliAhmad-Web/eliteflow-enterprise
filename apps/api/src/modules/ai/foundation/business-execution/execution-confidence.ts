/**
 * Execution confidence helpers.
 */

export function clampExecutionConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.3;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

export function scoreExecutionConfidence(input: {
  readonly hasRecommendation: boolean;
  readonly recommendationConfidence: number;
  readonly phaseCount: number;
  readonly milestoneCount: number;
  readonly dependencyCount: number;
  readonly hasRollback: boolean;
}): number {
  let score = 0.2;
  if (input.hasRecommendation) {
    score += Math.min(0.4, Math.max(0, input.recommendationConfidence) * 0.45);
  }
  if (input.phaseCount > 0) score += Math.min(0.12, input.phaseCount * 0.03);
  if (input.milestoneCount > 0) {
    score += Math.min(0.1, input.milestoneCount * 0.015);
  }
  if (input.dependencyCount > 0) {
    score += Math.min(0.08, input.dependencyCount * 0.02);
  }
  if (input.hasRollback) score += 0.06;
  return clampExecutionConfidence(score);
}
