/**
 * Central Backup Validation Service — validates metadata only.
 * Does NOT create backups, replicate, or execute restores.
 */

import { randomUUID } from "node:crypto";

import { resolveEncryptionKeys } from "../../../config/encryption.config.js";
import { logger } from "../logger.js";
import {
  aggregateHealth,
  runChecksForCategory,
} from "./backup-validation.checks.js";
import {
  collectBackupRecords,
  collectCategoryEvidence,
} from "./backup-validation.collector.js";
import {
  getBackupValidationConfig,
  isBackupValidationEnabled,
} from "./backup-validation.config.js";
import {
  getBackupValidationState,
  listValidationHistory,
  setLastValidationReport,
  setNextValidationAt,
} from "./backup-validation.state.js";
import {
  BACKUP_TARGET_CATEGORIES,
  BACKUP_VALIDATION_EVENTS,
  type BackupHealthStatus,
  type BackupValidationDashboardMetrics,
  type BackupValidationHistoryEntry,
  type BackupValidationReport,
  type BackupValidationStatusSnapshot,
  type BackupValidationType,
  type CategoryValidationResult,
} from "./backup-validation.types.js";

function isEncryptionConfigured(): boolean {
  try {
    resolveEncryptionKeys();
    return true;
  } catch {
    return false;
  }
}

function emitEvent(
  event: string,
  metadata: Record<string, unknown> = {},
): void {
  // Never log secrets — metadata must already be sanitized by callers.
  logger.info(`[backup-validation] ${event}`, metadata);
}

class BackupValidationService {
  async getStatus(): Promise<BackupValidationStatusSnapshot> {
    const state = getBackupValidationState();
    const last = state.lastReport;
    const enabled = isBackupValidationEnabled();

    return {
      enabled,
      health: last?.health ?? "UNKNOWN",
      coveragePercent: last?.coveragePercent ?? 0,
      failures: last ? last.failed + last.corrupted : 0,
      lastValidationAt: last?.completedAt ?? null,
      nextValidationAt: state.nextValidationAt,
      lastValidationType: state.lastValidationType,
      totalBackups: last?.totalBackups ?? 0,
      encryptionStatus: last?.encryptionStatus ?? "UNKNOWN",
      evaluatedAt: new Date().toISOString(),
    };
  }

  async getReport(): Promise<BackupValidationReport | null> {
    return getBackupValidationState().lastReport;
  }

  getHistory(limit?: number): BackupValidationHistoryEntry[] {
    return listValidationHistory(limit);
  }

  getDashboardMetrics(): BackupValidationDashboardMetrics {
    const state = getBackupValidationState();
    const last = state.lastReport;
    const health: BackupHealthStatus = last?.health ?? "UNKNOWN";
    return {
      status: health,
      coverage: last?.coveragePercent ?? 0,
      health,
      failures: last ? last.failed + last.corrupted : 0,
      lastValidationAt: last?.completedAt ?? null,
      nextValidationAt: state.nextValidationAt,
    };
  }

  /**
   * Run validation. Never creates backups or executes restores.
   */
  async runValidation(input: {
    validationType: BackupValidationType;
    triggeredBy?: string | null;
  }): Promise<BackupValidationReport> {
    const cfg = getBackupValidationConfig();
    const startedAt = new Date();
    const runId = randomUUID();

    emitEvent(BACKUP_VALIDATION_EVENTS.BACKUP_VALIDATION_STARTED, {
      runId,
      validationType: input.validationType,
    });

    try {
      const [records, evidenceList] = await Promise.all([
        collectBackupRecords(),
        collectCategoryEvidence(),
      ]);
      const encryptionConfigured = isEncryptionConfigured();
      const evidenceByCategory = new Map(
        evidenceList.map((e) => [e.category, e]),
      );

      const categories: CategoryValidationResult[] = [];
      let totalExpired = 0;
      let totalCorrupted = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;

      for (const category of BACKUP_TARGET_CATEGORIES) {
        const evidence = evidenceByCategory.get(category) ?? {
          category,
          present: false,
          count: 0,
          detail: "No evidence",
        };
        const result = runChecksForCategory({
          category,
          records,
          evidence,
          validationType: input.validationType,
          encryptionConfigured,
        });

        for (const check of result.checks) {
          if (check.checkId === "CORRUPTED_BACKUPS" && check.status === "FAIL") {
            emitEvent(BACKUP_VALIDATION_EVENTS.BACKUP_CORRUPTED, {
              category,
              runId,
            });
          }
          if (check.checkId === "EXPIRED_BACKUPS" && check.status !== "PASS" && check.status !== "SKIP") {
            emitEvent(BACKUP_VALIDATION_EVENTS.BACKUP_EXPIRED, {
              category,
              runId,
            });
          }
          if (check.checkId === "BACKUP_EXISTS" && check.status === "FAIL") {
            emitEvent(BACKUP_VALIDATION_EVENTS.BACKUP_MISSING, {
              category,
              runId,
            });
          }
          if (check.checkId === "BACKUP_ENCRYPTION" && check.status === "FAIL") {
            emitEvent(BACKUP_VALIDATION_EVENTS.BACKUP_ENCRYPTION_FAILED, {
              category,
              runId,
            });
          }
        }

        categories.push({
          category,
          health: result.health,
          checks: result.checks,
          targetCount: records.filter((r) => r.category === category).length,
          passedChecks: result.checks.filter((c) => c.status === "PASS").length,
          failedChecks: result.checks.filter((c) => c.status === "FAIL").length,
          warningChecks: result.checks.filter((c) => c.status === "WARN").length,
        });

        totalExpired += result.expired;
        totalCorrupted += result.corrupted;
        totalSuccessful += result.successful;
        totalFailed += result.failed;
      }

      const health = aggregateHealth(categories.map((c) => c.health));
      const coveredCategories = categories.filter(
        (c) => c.health === "HEALTHY" || c.health === "WARNING",
      ).length;
      const coveragePercent = Math.round(
        (coveredCategories / Math.max(BACKUP_TARGET_CATEGORIES.length, 1)) * 100,
      );

      let encryptionStatus: BackupValidationReport["encryptionStatus"] =
        "UNKNOWN";
      if (!encryptionConfigured) encryptionStatus = "UNENCRYPTED";
      else {
        const encFails = categories.some((c) =>
          c.checks.some(
            (ch) => ch.checkId === "BACKUP_ENCRYPTION" && ch.status === "FAIL",
          ),
        );
        const encWarns = categories.some((c) =>
          c.checks.some(
            (ch) => ch.checkId === "BACKUP_ENCRYPTION" && ch.status === "WARN",
          ),
        );
        encryptionStatus = encFails
          ? "UNENCRYPTED"
          : encWarns
            ? "PARTIAL"
            : "ENCRYPTED";
      }

      const completedAt = new Date();
      const nextValidationAt = new Date(
        completedAt.getTime() + cfg.scheduleIntervalMs,
      ).toISOString();

      const report: BackupValidationReport = {
        runId,
        validationType: input.validationType,
        health,
        totalBackups: records.length,
        successful: totalSuccessful,
        failed: totalFailed,
        expired: totalExpired,
        corrupted: totalCorrupted,
        encryptionStatus,
        coveragePercent,
        categories,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        triggeredBy: input.triggeredBy ?? null,
        nextValidationAt,
      };

      setLastValidationReport(report, cfg.historyLimit);
      setNextValidationAt(nextValidationAt);

      if (health === "FAILED") {
        emitEvent(BACKUP_VALIDATION_EVENTS.BACKUP_VALIDATION_FAILED, {
          runId,
          health,
          coveragePercent,
        });
      } else {
        emitEvent(BACKUP_VALIDATION_EVENTS.BACKUP_VALIDATION_SUCCESS, {
          runId,
          health,
          coveragePercent,
        });
      }

      return report;
    } catch (error) {
      emitEvent(BACKUP_VALIDATION_EVENTS.BACKUP_VALIDATION_FAILED, {
        runId,
        error: error instanceof Error ? error.message : "Validation failed",
      });
      throw error;
    }
  }
}

export const backupValidationService = new BackupValidationService();
