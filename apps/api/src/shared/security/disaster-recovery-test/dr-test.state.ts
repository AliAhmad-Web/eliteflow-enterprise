/**
 * In-memory DR test state (no Prisma redesign).
 */

import type {
  DrTestHistoryEntry,
  DrTestReport,
} from "./dr-test.types.js";

interface DrTestRuntimeState {
  lastReport: DrTestReport | null;
  history: DrTestHistoryEntry[];
  nextTestAt: string | null;
}

const state: DrTestRuntimeState = {
  lastReport: null,
  history: [],
  nextTestAt: null,
};

export function getDrTestState(): DrTestRuntimeState {
  return state;
}

export function setLastDrTestReport(
  report: DrTestReport,
  historyLimit: number,
): void {
  state.lastReport = report;
  state.nextTestAt = report.nextTestAt;

  state.history.unshift({
    runId: report.runId,
    testType: report.testType,
    status: report.status,
    overallReadiness: report.overallReadiness,
    successRate: report.successRate,
    recoveryDurationMs: report.recoveryDurationMs,
    completedAt: report.completedAt,
    triggeredBy: report.triggeredBy,
  });

  if (state.history.length > historyLimit) {
    state.history.length = historyLimit;
  }
}

export function setNextDrTestAt(iso: string | null): void {
  state.nextTestAt = iso;
}

export function listDrTestHistory(limit?: number): DrTestHistoryEntry[] {
  const take = limit ?? state.history.length;
  return state.history.slice(0, take);
}
