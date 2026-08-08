/**
 * Central Encryption Audit Service — verifies encryption posture.
 * Does NOT encrypt, decrypt secrets for output, rotate keys, or change crypto.
 */

import { randomUUID } from "node:crypto";

import { logger } from "../logger.js";
import {
  aggregateStatus,
  buildSourceResults,
  collectConfigEvidence,
  computeOverallScore,
  runGlobalChecks,
} from "./encryption-audit.checks.js";
import { collectFieldSamples } from "./encryption-audit.collector.js";
import {
  getEncryptionAuditConfig,
  isEncryptionAuditEnabled,
} from "./encryption-audit.config.js";
import {
  getEncryptionAuditState,
  listEncryptionAuditHistory,
  setLastEncryptionAuditReport,
  setNextEncryptionAuditAt,
} from "./encryption-audit.state.js";
import {
  ENCRYPTION_AUDIT_EVENTS,
  type EncryptionAuditDashboardMetrics,
  type EncryptionAuditHistoryEntry,
  type EncryptionAuditReport,
  type EncryptionAuditStatusSnapshot,
} from "./encryption-audit.types.js";

function emitEvent(
  event: string,
  metadata: Record<string, unknown> = {},
): void {
  logger.info(`[encryption-audit] ${event}`, metadata);
}

class EncryptionAuditService {
  async getStatus(): Promise<EncryptionAuditStatusSnapshot> {
    const state = getEncryptionAuditState();
    const last = state.lastReport;
    return {
      enabled: isEncryptionAuditEnabled(),
      status: last?.status ?? "UNKNOWN",
      overallScore: last?.overallScore ?? 0,
      coveragePercent: last?.coveragePercent ?? 0,
      weakAlgorithms: last?.weakAlgorithms ?? 0,
      failedChecks: last
        ? last.checks.filter((c) => c.status === "FAIL").length
        : 0,
      recommendations: last?.recommendations.length ?? 0,
      lastAuditAt: last?.completedAt ?? null,
      nextAuditAt: state.nextAuditAt,
      evaluatedAt: new Date().toISOString(),
    };
  }

  async getReport(): Promise<EncryptionAuditReport | null> {
    return getEncryptionAuditState().lastReport;
  }

  getHistory(limit?: number): EncryptionAuditHistoryEntry[] {
    return listEncryptionAuditHistory(limit);
  }

  getDashboardMetrics(): EncryptionAuditDashboardMetrics {
    const state = getEncryptionAuditState();
    const last = state.lastReport;
    return {
      overallScore: last?.overallScore ?? 0,
      coverage: last?.coveragePercent ?? 0,
      weakAlgorithms: last?.weakAlgorithms ?? 0,
      failedChecks: last
        ? last.checks.filter((c) => c.status === "FAIL").length
        : 0,
      recommendations: last?.recommendations.length ?? 0,
      lastAuditAt: last?.completedAt ?? null,
    };
  }

  async runAudit(input: {
    triggeredBy?: string | null;
  }): Promise<EncryptionAuditReport> {
    const cfg = getEncryptionAuditConfig();
    const startedAt = new Date();
    const runId = randomUUID();

    emitEvent(ENCRYPTION_AUDIT_EVENTS.ENCRYPTION_AUDIT_STARTED, { runId });

    try {
      const evidence = collectConfigEvidence();
      const samples = await collectFieldSamples();
      const {
        checks,
        recommendations,
        weakAlgorithms,
        expiredKeys,
        invalidConfigurations,
      } = runGlobalChecks(evidence, samples);

      for (const check of checks) {
        if (check.checkId === "PLAINTEXT_DETECTION" && check.status === "FAIL") {
          emitEvent(ENCRYPTION_AUDIT_EVENTS.PLAINTEXT_DETECTED, { runId });
        }
        if (
          (check.checkId === "KEY_AVAILABILITY" ||
            check.checkId === "KEY_LENGTH" ||
            check.checkId === "CONFIGURATION_VALIDATION") &&
          check.status === "FAIL"
        ) {
          emitEvent(ENCRYPTION_AUDIT_EVENTS.INVALID_KEY_CONFIGURATION, {
            runId,
            checkId: check.checkId,
          });
        }
        if (
          (check.checkId === "AES_CONFIGURATION" ||
            check.checkId === "JWT_SIGNING_CONFIGURATION") &&
          check.status === "FAIL"
        ) {
          emitEvent(ENCRYPTION_AUDIT_EVENTS.WEAK_ENCRYPTION, {
            runId,
            checkId: check.checkId,
          });
        }
        if (check.checkId === "TLS_CONFIGURATION" && check.status === "WARN") {
          emitEvent(ENCRYPTION_AUDIT_EVENTS.TLS_CONFIGURATION_WARNING, {
            runId,
          });
        }
        if (
          check.checkId === "CERTIFICATE_VALIDATION" &&
          (check.status === "WARN" || check.status === "FAIL")
        ) {
          emitEvent(ENCRYPTION_AUDIT_EVENTS.CERTIFICATE_WARNING, { runId });
        }
      }

      const status = aggregateStatus(checks);
      const overallScore = computeOverallScore(checks);
      const encryptedAssets = samples.reduce((s, x) => s + x.encryptedLike, 0);
      const unencryptedAssets = samples.reduce(
        (s, x) => s + x.plaintextSuspect + x.missingParts,
        0,
      );
      const sourcesWithData = samples.filter((s) => s.total > 0).length;
      const coveragePercent = Math.round(
        (sourcesWithData / Math.max(samples.length, 1)) * 100,
      );

      const completedAt = new Date();
      const nextAuditAt = new Date(
        completedAt.getTime() + cfg.scheduleIntervalMs,
      ).toISOString();

      const report: EncryptionAuditReport = {
        runId,
        status,
        overallScore,
        encryptedAssets,
        unencryptedAssets,
        weakAlgorithms,
        expiredKeys,
        invalidConfigurations,
        coveragePercent,
        recommendations,
        sources: buildSourceResults(samples, status),
        checks,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        triggeredBy: input.triggeredBy ?? null,
        nextAuditAt,
      };

      setLastEncryptionAuditReport(report, cfg.historyLimit);
      setNextEncryptionAuditAt(nextAuditAt);

      if (status === "FAILED") {
        emitEvent(ENCRYPTION_AUDIT_EVENTS.ENCRYPTION_AUDIT_FAILED, {
          runId,
          overallScore,
          status,
        });
      } else {
        emitEvent(ENCRYPTION_AUDIT_EVENTS.ENCRYPTION_AUDIT_SUCCESS, {
          runId,
          overallScore,
          status,
        });
      }

      return report;
    } catch (error) {
      emitEvent(ENCRYPTION_AUDIT_EVENTS.ENCRYPTION_AUDIT_FAILED, {
        runId,
        error: error instanceof Error ? error.message : "Audit failed",
      });
      throw error;
    }
  }
}

export const encryptionAuditService = new EncryptionAuditService();
