/**
 * Business Action confidence helpers.
 */

export function clampBusinessActionConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.3;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

export function scoreBusinessActionConfidence(input: {
  readonly hasDecision: boolean;
  readonly decisionConfidence: number;
  readonly stepCount: number;
  readonly executable: boolean;
  readonly hasPermissions: boolean;
}): number {
  let score = 0.2;
  if (input.hasDecision) {
    score += Math.min(0.4, Math.max(0, input.decisionConfidence) * 0.45);
  }
  if (input.stepCount > 0) {
    score += Math.min(0.15, input.stepCount * 0.04);
  }
  if (input.executable) score += 0.1;
  if (input.hasPermissions) score += 0.08;
  return clampBusinessActionConfidence(score);
}
