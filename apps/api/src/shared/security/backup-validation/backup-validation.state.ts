/**
 * In-memory runtime state for backup validation (no Prisma redesign).
 */

import type {
  BackupValidationHistoryEntry,
  BackupValidationReport,
  BackupValidationType,
} from "./backup-validation.types.js";

interface BackupValidationRuntimeState {
  lastReport: BackupValidationReport | null;
  history: BackupValidationHistoryEntry[];
  nextValidationAt: string | null;
  lastValidationType: BackupValidationType | null;
}

const state: BackupValidationRuntimeState = {
  lastReport: null,
  history: [],
  nextValidationAt: null,
  lastValidationType: null,
};

export function getBackupValidationState(): BackupValidationRuntimeState {
  return state;
}

export function setLastValidationReport(
  report: BackupValidationReport,
  historyLimit: number,
): void {
  state.lastReport = report;
  state.lastValidationType = report.validationType;
  state.nextValidationAt = report.nextValidationAt;

  state.history.unshift({
    runId: report.runId,
    validationType: report.validationType,
    health: report.health,
    coveragePercent: report.coveragePercent,
    failures: report.failed + report.corrupted,
    completedAt: report.completedAt,
    triggeredBy: report.triggeredBy,
  });

  if (state.history.length > historyLimit) {
    state.history.length = historyLimit;
  }
}

export function setNextValidationAt(iso: string | null): void {
  state.nextValidationAt = iso;
}

export function listValidationHistory(
  limit?: number,
): BackupValidationHistoryEntry[] {
  const take = limit ?? state.history.length;
  return state.history.slice(0, take);
}
