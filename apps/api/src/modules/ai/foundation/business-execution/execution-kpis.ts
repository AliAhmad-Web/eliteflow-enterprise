/**
 * Execution KPIs — success measures for the plan.
 */

import { sanitizeExecutionText } from "./execution-summary.js";

export interface AiBusinessExecutionKpi {
  readonly id: string;
  readonly label: string;
  readonly target: string;
}

export function buildExecutionKpis(input: {
  readonly recommendationCount: number;
  readonly priority: "low" | "medium" | "high" | "critical";
}): readonly AiBusinessExecutionKpi[] {
  return Object.freeze([
    Object.freeze({
      id: "kpi.completion",
      label: "Plan Completion",
      target: sanitizeExecutionText(
        `Complete planned follow-up for ${input.recommendationCount} recommendation${input.recommendationCount === 1 ? "" : "s"}`,
        100,
      ),
    }),
    Object.freeze({
      id: "kpi.risk-reduction",
      label: "Risk Reduction",
      target:
        input.priority === "critical" || input.priority === "high"
          ? "Reduce elevated recommendation risks"
          : "Maintain low risk posture",
    }),
    Object.freeze({
      id: "kpi.throughput",
      label: "Operational Throughput",
      target: "Improve operational signal quality after execute phase",
    }),
  ]);
}
