/**
 * Business Intelligence confidence helpers.
 */

export function clampBusinessIntelligenceConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.3;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

export function scoreBusinessIntelligenceConfidence(input: {
  readonly hasModuleData: boolean;
  readonly hasReasoning: boolean;
  readonly hasDecision: boolean;
  readonly hasAction: boolean;
  readonly hasWorkflow: boolean;
  readonly kpiCount: number;
  readonly metricCount: number;
}): number {
  let score = 0.2;
  if (input.hasModuleData) score += 0.15;
  if (input.hasReasoning) score += 0.15;
  if (input.hasDecision) score += 0.1;
  if (input.hasAction) score += 0.08;
  if (input.hasWorkflow) score += 0.07;
  if (input.kpiCount > 0) score += Math.min(0.12, input.kpiCount * 0.03);
  if (input.metricCount > 0) score += Math.min(0.1, input.metricCount * 0.02);
  return clampBusinessIntelligenceConfidence(score);
}
