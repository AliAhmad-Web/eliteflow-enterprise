/**
 * Business Intelligence KPIs — safe aggregate indicators.
 */

export type AiBiKpiStatus = "healthy" | "watch" | "critical" | "unknown";

export interface AiBiKpi {
  readonly id: string;
  readonly name: string;
  readonly score: number;
  readonly status: AiBiKpiStatus;
}

export function formatBiKpiStatus(status: AiBiKpiStatus): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "watch":
      return "Watch";
    case "critical":
      return "Critical";
    case "unknown":
      return "Unknown";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function sanitizeBiText(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildBusinessKpis(input: {
  readonly moduleOkCount: number;
  readonly riskHighCount: number;
  readonly riskMediumCount: number;
  readonly overdueSignal: boolean;
  readonly unreadSignal: boolean;
  readonly decisionPriority: string | null;
}): readonly AiBiKpi[] {
  const workloadScore = input.overdueSignal
    ? 35
    : input.moduleOkCount > 0
      ? 75
      : 50;
  const riskScore =
    input.riskHighCount > 0
      ? 25
      : input.riskMediumCount > 0
        ? 55
        : 85;
  const attentionScore = input.unreadSignal ? 40 : 80;
  const executionScore =
    input.decisionPriority === "critical" || input.decisionPriority === "high"
      ? 45
      : 70;

  const toStatus = (score: number): AiBiKpiStatus => {
    if (score >= 70) return "healthy";
    if (score >= 45) return "watch";
    return "critical";
  };

  return Object.freeze([
    Object.freeze({
      id: "kpi.workload",
      name: "Workload",
      score: workloadScore,
      status: toStatus(workloadScore),
    }),
    Object.freeze({
      id: "kpi.risk",
      name: "Risk Posture",
      score: riskScore,
      status: toStatus(riskScore),
    }),
    Object.freeze({
      id: "kpi.attention",
      name: "Attention Load",
      score: attentionScore,
      status: toStatus(attentionScore),
    }),
    Object.freeze({
      id: "kpi.execution",
      name: "Execution Readiness",
      score: executionScore,
      status: toStatus(executionScore),
    }),
  ]);
}
