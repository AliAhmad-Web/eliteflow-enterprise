/**
 * Business Intelligence trends — directional signals from runtime.
 */

export type AiBiTrendDirection = "improving" | "stable" | "declining" | "unknown";

export interface AiBiTrend {
  readonly id: string;
  readonly label: string;
  readonly direction: AiBiTrendDirection;
}

export function formatBiTrendDirection(
  direction: AiBiTrendDirection,
): string {
  switch (direction) {
    case "improving":
      return "Improving";
    case "stable":
      return "Stable";
    case "declining":
      return "Declining";
    case "unknown":
      return "Unknown";
    default: {
      const _exhaustive: never = direction;
      return _exhaustive;
    }
  }
}

export function buildBusinessTrends(input: {
  readonly riskHighCount: number;
  readonly riskMediumCount: number;
  readonly overdueSignal: boolean;
  readonly openWorkloadHigh: boolean;
  readonly hasReasoning: boolean;
}): readonly AiBiTrend[] {
  const riskDirection: AiBiTrendDirection = !input.hasReasoning
    ? "unknown"
    : input.riskHighCount > 0
      ? "declining"
      : input.riskMediumCount > 0
        ? "stable"
        : "improving";

  const workloadDirection: AiBiTrendDirection =
    input.overdueSignal || input.openWorkloadHigh
      ? "declining"
      : input.hasReasoning
        ? "stable"
        : "unknown";

  let overallDirection: AiBiTrendDirection = "stable";
  if (riskDirection === "declining" || workloadDirection === "declining") {
    overallDirection = "declining";
  } else if (riskDirection === "unknown" || workloadDirection === "unknown") {
    overallDirection = "unknown";
  } else if (riskDirection === "improving") {
    overallDirection = "improving";
  } else {
    overallDirection = "stable";
  }

  return Object.freeze([
    Object.freeze({
      id: "trend.risk",
      label: "Risk Trend",
      direction: riskDirection,
    }),
    Object.freeze({
      id: "trend.workload",
      label: "Workload Trend",
      direction: workloadDirection,
    }),
    Object.freeze({
      id: "trend.overall",
      label: "Overall Trend",
      direction: overallDirection,
    }),
  ]);
}
