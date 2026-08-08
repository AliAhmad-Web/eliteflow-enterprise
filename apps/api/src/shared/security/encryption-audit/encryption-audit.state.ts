/**
 * In-memory runtime state for encryption audit (no Prisma redesign).
 */

import type {
  EncryptionAuditHistoryEntry,
  EncryptionAuditReport,
} from "./encryption-audit.types.js";

interface EncryptionAuditRuntimeState {
  lastReport: EncryptionAuditReport | null;
  history: EncryptionAuditHistoryEntry[];
  nextAuditAt: string | null;
}

const state: EncryptionAuditRuntimeState = {
  lastReport: null,
  history: [],
  nextAuditAt: null,
};

export function getEncryptionAuditState(): EncryptionAuditRuntimeState {
  return state;
}

export function setLastEncryptionAuditReport(
  report: EncryptionAuditReport,
  historyLimit: number,
): void {
  state.lastReport = report;
  state.nextAuditAt = report.nextAuditAt;

  state.history.unshift({
    runId: report.runId,
    status: report.status,
    overallScore: report.overallScore,
    coveragePercent: report.coveragePercent,
    failedChecks: report.checks.filter((c) => c.status === "FAIL").length,
    completedAt: report.completedAt,
    triggeredBy: report.triggeredBy,
  });

  if (state.history.length > historyLimit) {
    state.history.length = historyLimit;
  }
}

export function setNextEncryptionAuditAt(iso: string | null): void {
  state.nextAuditAt = iso;
}

export function listEncryptionAuditHistory(
  limit?: number,
): EncryptionAuditHistoryEntry[] {
  const take = limit ?? state.history.length;
  return state.history.slice(0, take);
}
