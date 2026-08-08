/**
 * In-memory security regression assessment state (no Prisma redesign).
 */

import type {
  SecurityRegressionHistoryEntry,
  SecurityRegressionReport,
} from "./security-regression.types.js";

interface SecurityRegressionRuntimeState {
  lastReport: SecurityRegressionReport | null;
  history: SecurityRegressionHistoryEntry[];
  nextAssessmentAt: string | null;
}

const state: SecurityRegressionRuntimeState = {
  lastReport: null,
  history: [],
  nextAssessmentAt: null,
};

export function getSecurityRegressionState(): SecurityRegressionRuntimeState {
  return state;
}

export function setLastSecurityRegressionReport(
  report: SecurityRegressionReport,
  historyLimit: number,
): void {
  state.lastReport = report;
  state.nextAssessmentAt = report.nextAssessmentAt;

  state.history.unshift({
    runId: report.runId,
    testType: report.testType,
    overallHealth: report.overallHealth,
    coverage: report.coverage,
    failedControls: report.failedControls,
    criticalIssues: report.criticalIssues,
    deploymentReadinessScore: report.deploymentReadinessScore,
    completedAt: report.completedAt,
    triggeredBy: report.triggeredBy,
  });

  if (state.history.length > historyLimit) {
    state.history.length = historyLimit;
  }
}

export function setNextSecurityRegressionAt(iso: string | null): void {
  state.nextAssessmentAt = iso;
}

export function listSecurityRegressionHistory(
  limit?: number,
): SecurityRegressionHistoryEntry[] {
  const take = limit ?? state.history.length;
  return state.history.slice(0, take);
}
