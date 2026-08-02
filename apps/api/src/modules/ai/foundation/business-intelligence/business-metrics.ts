/**
 * Business Intelligence metrics — count-based runtime aggregates.
 */

export interface AiBiMetric {
  readonly label: string;
  readonly value: number;
}

export function buildBusinessMetrics(input: {
  readonly moduleResponseCount: number;
  readonly summaryItemCount: number;
  readonly insightCount: number;
  readonly riskCount: number;
  readonly recommendationCount: number;
  readonly workflowStepCount: number;
}): readonly AiBiMetric[] {
  return Object.freeze([
    Object.freeze({
      label: "Modules Analyzed",
      value: input.moduleResponseCount,
    }),
    Object.freeze({
      label: "Summary Signals",
      value: input.summaryItemCount,
    }),
    Object.freeze({
      label: "Insights",
      value: input.insightCount,
    }),
    Object.freeze({
      label: "Risk Signals",
      value: input.riskCount,
    }),
    Object.freeze({
      label: "Recommendations",
      value: input.recommendationCount,
    }),
    Object.freeze({
      label: "Workflow Steps",
      value: input.workflowStepCount,
    }),
  ]);
}
