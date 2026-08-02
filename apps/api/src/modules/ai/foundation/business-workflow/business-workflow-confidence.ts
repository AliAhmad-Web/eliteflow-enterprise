/**
 * Business Workflow confidence helpers.
 */

export function clampBusinessWorkflowConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.3;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

export function scoreBusinessWorkflowConfidence(input: {
  readonly hasAction: boolean;
  readonly actionConfidence: number;
  readonly stepCount: number;
  readonly transitionCount: number;
  readonly satisfiedConditionCount: number;
  readonly conditionCount: number;
  readonly executable: boolean;
}): number {
  let score = 0.2;
  if (input.hasAction) {
    score += Math.min(0.35, Math.max(0, input.actionConfidence) * 0.4);
  }
  if (input.stepCount > 0) {
    score += Math.min(0.15, input.stepCount * 0.03);
  }
  if (input.transitionCount > 0) {
    score += Math.min(0.1, input.transitionCount * 0.02);
  }
  if (input.conditionCount > 0) {
    score +=
      (input.satisfiedConditionCount / input.conditionCount) * 0.12;
  }
  if (input.executable) score += 0.08;
  return clampBusinessWorkflowConfidence(score);
}
