/**
 * In-memory tenant isolation assessment state (no Prisma redesign).
 */

import type {
  TenantIsolationHistoryEntry,
  TenantIsolationReport,
} from "./tenant-isolation.types.js";

interface TenantIsolationRuntimeState {
  lastReport: TenantIsolationReport | null;
  history: TenantIsolationHistoryEntry[];
  nextAssessmentAt: string | null;
}

const state: TenantIsolationRuntimeState = {
  lastReport: null,
  history: [],
  nextAssessmentAt: null,
};

export function getTenantIsolationState(): TenantIsolationRuntimeState {
  return state;
}

export function setLastTenantIsolationReport(
  report: TenantIsolationReport,
  historyLimit: number,
): void {
  state.lastReport = report;
  state.nextAssessmentAt = report.nextAssessmentAt;

  state.history.unshift({
    runId: report.runId,
    isolationScore: report.isolationScore,
    coverage: report.coverage,
    criticalRisks: report.criticalRisks,
    warnings: report.warnings,
    failedComponents: report.failedComponents.length,
    completedAt: report.completedAt,
    triggeredBy: report.triggeredBy,
  });

  if (state.history.length > historyLimit) {
    state.history.length = historyLimit;
  }
}

export function setNextTenantIsolationAt(iso: string | null): void {
  state.nextAssessmentAt = iso;
}

export function listTenantIsolationHistory(
  limit?: number,
): TenantIsolationHistoryEntry[] {
  const take = limit ?? state.history.length;
  return state.history.slice(0, take);
}
