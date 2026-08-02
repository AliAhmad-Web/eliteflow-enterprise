/**
 * Recommendation confidence helpers.
 */

export function clampRecommendationConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.3;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

export function scoreRecommendationConfidence(input: {
  readonly hasIntelligence: boolean;
  readonly intelligenceConfidence: number;
  readonly itemCount: number;
  readonly hasCriticalAlerts: boolean;
  readonly hasOpportunities: boolean;
}): number {
  let score = 0.2;
  if (input.hasIntelligence) {
    score += Math.min(0.4, Math.max(0, input.intelligenceConfidence) * 0.45);
  }
  if (input.itemCount > 0) {
    score += Math.min(0.2, input.itemCount * 0.03);
  }
  if (input.hasCriticalAlerts) score += 0.08;
  if (input.hasOpportunities) score += 0.08;
  return clampRecommendationConfidence(score);
}
