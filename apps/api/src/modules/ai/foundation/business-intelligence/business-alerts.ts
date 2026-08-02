/**
 * Business Intelligence alerts — critical/watch signals.
 */

export type AiBiAlertSeverity = "info" | "warning" | "critical";

export interface AiBiAlert {
  readonly id: string;
  readonly severity: AiBiAlertSeverity;
  readonly text: string;
}

export function formatBiAlertSeverity(severity: AiBiAlertSeverity): string {
  switch (severity) {
    case "info":
      return "Info";
    case "warning":
      return "Warning";
    case "critical":
      return "Critical";
    default: {
      const _exhaustive: never = severity;
      return _exhaustive;
    }
  }
}

export function buildBusinessAlerts(input: {
  readonly riskHighTexts: readonly string[];
  readonly riskMediumTexts: readonly string[];
  readonly overdueSignal: boolean;
  readonly decisionPriority: string | null;
}): readonly AiBiAlert[] {
  const alerts: AiBiAlert[] = [];

  for (const [index, text] of input.riskHighTexts.slice(0, 3).entries()) {
    alerts.push({
      id: `alert.risk.high.${index + 1}`,
      severity: "critical",
      text: text.slice(0, 120),
    });
  }
  if (input.overdueSignal) {
    alerts.push({
      id: "alert.overdue",
      severity: "critical",
      text: "Overdue work detected in runtime summaries",
    });
  }
  for (const [index, text] of input.riskMediumTexts.slice(0, 2).entries()) {
    alerts.push({
      id: `alert.risk.medium.${index + 1}`,
      severity: "warning",
      text: text.slice(0, 120),
    });
  }
  if (
    input.decisionPriority === "critical" ||
    input.decisionPriority === "high"
  ) {
    alerts.push({
      id: "alert.decision",
      severity: "warning",
      text: `Elevated decision priority: ${input.decisionPriority}`,
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      id: "alert.none",
      severity: "info",
      text: "No critical alerts from current runtime signals",
    });
  }

  return Object.freeze(alerts.slice(0, 6).map((item) => Object.freeze(item)));
}
