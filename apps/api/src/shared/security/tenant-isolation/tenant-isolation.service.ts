/**
 * TenantIsolationService — validation / assessment framework only.
 * Never redesigns multi-tenant architecture or mutates business data.
 */

import { randomUUID } from "node:crypto";

import { logger } from "../logger.js";
import { securityMonitoringService } from "../monitoring/index.js";
import { THREAT_DETECTION_TYPES } from "../monitoring/monitoring.types.js";
import {
  getTenantIsolationConfig,
  isTenantIsolationEnabled,
} from "./tenant-isolation.config.js";
import {
  buildExecutiveSummary,
  buildRecommendations,
  buildValidatedComponents,
  computeCoverage,
  computeIsolationScore,
  runIsolationAssessments,
  summarizeRisk,
} from "./tenant-isolation.engine.js";
import {
  getTenantIsolationState,
  listTenantIsolationHistory,
  setLastTenantIsolationReport,
  setNextTenantIsolationAt,
} from "./tenant-isolation.state.js";
import {
  TENANT_ISOLATION_CATEGORIES,
  TENANT_ISOLATION_EVENTS,
  type TenantIsolationDashboardMetrics,
  type TenantIsolationHistoryEntry,
  type TenantIsolationReport,
  type TenantIsolationStatusSnapshot,
} from "./tenant-isolation.types.js";

function emitLog(
  event: string,
  metadata: Record<string, unknown> = {},
): void {
  logger.info(`[tenant-isolation] ${event}`, metadata);
}

function emitMonitoring(
  type:
    | typeof THREAT_DETECTION_TYPES.TENANT_ISOLATION_STARTED
    | typeof THREAT_DETECTION_TYPES.TENANT_ISOLATION_COMPLETED
    | typeof THREAT_DETECTION_TYPES.TENANT_CONTEXT_MISSING
    | typeof THREAT_DETECTION_TYPES.CROSS_TENANT_ACCESS
    | typeof THREAT_DETECTION_TYPES.CACHE_ISOLATION_FAILED
    | typeof THREAT_DETECTION_TYPES.SESSION_ISOLATION_FAILED
    | typeof THREAT_DETECTION_TYPES.AI_ISOLATION_FAILED
    | typeof THREAT_DETECTION_TYPES.FILE_ISOLATION_FAILED,
  message: string,
  metadata?: Record<string, unknown>,
): void {
  void securityMonitoringService.reportTenantIsolationEvent({
    type,
    resource: "tenant_isolation",
    message,
    metadata: {
      ...metadata,
      sanitized: true,
      assessmentOnly: true,
    },
  });
}

class TenantIsolationService {
  async getStatus(): Promise<TenantIsolationStatusSnapshot> {
    const state = getTenantIsolationState();
    const last = state.lastReport;
    return {
      enabled: isTenantIsolationEnabled(),
      isolationScore: last?.isolationScore ?? 0,
      coverage: last?.coverage ?? 0,
      criticalRisks: last?.criticalRisks ?? 0,
      warnings: last?.warnings ?? 0,
      validatedComponents: last?.validatedComponents.length ?? 0,
      failedComponents: last?.failedComponents.length ?? 0,
      lastAssessmentAt: last?.completedAt ?? null,
      nextAssessmentAt: state.nextAssessmentAt,
      evaluatedAt: new Date().toISOString(),
    };
  }

  async getReport(): Promise<TenantIsolationReport | null> {
    return getTenantIsolationState().lastReport;
  }

  getHistory(limit?: number): TenantIsolationHistoryEntry[] {
    return listTenantIsolationHistory(limit);
  }

  getDashboardMetrics(): TenantIsolationDashboardMetrics {
    const state = getTenantIsolationState();
    const last = state.lastReport;
    return {
      isolationScore: last?.isolationScore ?? 0,
      coverage: last?.coverage ?? 0,
      criticalRisks: last?.criticalRisks ?? 0,
      warnings: last?.warnings ?? 0,
      history: state.history.length,
      lastAssessmentAt: last?.completedAt ?? null,
    };
  }

  /**
   * Run a non-destructive tenant isolation assessment.
   */
  async runAssessment(input: {
    triggeredBy?: string | null;
  }): Promise<TenantIsolationReport> {
    const cfg = getTenantIsolationConfig();
    const runId = randomUUID();
    const startedAt = new Date();

    emitLog(TENANT_ISOLATION_EVENTS.TENANT_ISOLATION_STARTED, {
      runId,
      assessmentOnly: true,
    });
    emitMonitoring(
      THREAT_DETECTION_TYPES.TENANT_ISOLATION_STARTED,
      "Tenant isolation assessment started",
      { runId },
    );

    try {
      const findings = await runIsolationAssessments();
      const riskSummary = summarizeRisk(findings);
      const isolationScore = computeIsolationScore(findings);
      const coverage = computeCoverage(findings);
      const validatedComponents = buildValidatedComponents(findings);
      const failedComponents = validatedComponents
        .filter((c) => c.status === "FAILED")
        .map((c) => c.category);
      const warningControls = findings.filter(
        (f) => f.status === "WARNING",
      ).length;
      const passedControls = findings.filter((f) => f.status === "PASSED")
        .length;
      const failedControls = findings.filter((f) => f.status === "FAILED")
        .length;
      const criticalRisks = findings.filter(
        (f) =>
          (f.status === "FAILED" || f.status === "WARNING") &&
          f.severity === "CRITICAL",
      ).length;
      const recommendations = buildRecommendations(findings);

      for (const f of findings) {
        if (f.status !== "FAILED" && f.status !== "WARNING") continue;

        if (f.checkType === "MISSING_TENANT_CONTEXT") {
          emitMonitoring(
            THREAT_DETECTION_TYPES.TENANT_CONTEXT_MISSING,
            f.title,
            { runId, controlId: f.controlId, severity: f.severity },
          );
        }
        if (
          f.checkType === "CROSS_TENANT_READ" ||
          f.checkType === "CROSS_TENANT_WRITE" ||
          f.checkType === "CROSS_TENANT_DELETE"
        ) {
          emitMonitoring(
            THREAT_DETECTION_TYPES.CROSS_TENANT_ACCESS,
            f.title,
            { runId, controlId: f.controlId, severity: f.severity },
          );
        }
        if (f.checkType === "SHARED_CACHE_KEYS") {
          emitMonitoring(
            THREAT_DETECTION_TYPES.CACHE_ISOLATION_FAILED,
            f.title,
            { runId, controlId: f.controlId, severity: f.severity },
          );
        }
        if (f.checkType === "SHARED_SESSION_KEYS") {
          emitMonitoring(
            THREAT_DETECTION_TYPES.SESSION_ISOLATION_FAILED,
            f.title,
            { runId, controlId: f.controlId, severity: f.severity },
          );
        }
        if (f.checkType === "SHARED_AI_MEMORY") {
          emitMonitoring(
            THREAT_DETECTION_TYPES.AI_ISOLATION_FAILED,
            f.title,
            { runId, controlId: f.controlId, severity: f.severity },
          );
        }
        if (
          f.category === "FILE_ACCESS" &&
          (f.status === "FAILED" || f.status === "WARNING")
        ) {
          emitMonitoring(
            THREAT_DETECTION_TYPES.FILE_ISOLATION_FAILED,
            f.title,
            { runId, controlId: f.controlId, severity: f.severity },
          );
        }
      }

      const completedAt = new Date();
      const nextAssessmentAt = new Date(
        completedAt.getTime() + cfg.scheduleIntervalMs,
      ).toISOString();

      const report: TenantIsolationReport = {
        runId,
        isolationScore,
        coverage,
        validatedComponents,
        failedComponents,
        criticalRisks,
        warnings: warningControls,
        findings,
        riskSummary,
        recommendations,
        executiveSummary: buildExecutiveSummary({
          score: isolationScore,
          coverage,
          passed: passedControls,
          failed: failedControls,
          warnings: warningControls,
          criticalRisks,
        }),
        categoriesAssessed: TENANT_ISOLATION_CATEGORIES.length,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        triggeredBy: input.triggeredBy ?? null,
        nextAssessmentAt,
        assessmentOnly: true,
      };

      setLastTenantIsolationReport(report, cfg.historyLimit);
      setNextTenantIsolationAt(nextAssessmentAt);

      emitLog(TENANT_ISOLATION_EVENTS.TENANT_ISOLATION_COMPLETED, {
        runId,
        isolationScore,
        coverage,
        criticalRisks,
        assessmentOnly: true,
      });
      emitMonitoring(
        THREAT_DETECTION_TYPES.TENANT_ISOLATION_COMPLETED,
        "Tenant isolation assessment completed",
        {
          runId,
          isolationScore,
          coverage,
          criticalRisks,
          failedComponents: failedComponents.length,
        },
      );

      return report;
    } catch (error) {
      emitLog("TENANT_ISOLATION_FAILED", {
        runId,
        error: error instanceof Error ? error.message : "Assessment failed",
      });
      throw error;
    }
  }
}

export const tenantIsolationService = new TenantIsolationService();
