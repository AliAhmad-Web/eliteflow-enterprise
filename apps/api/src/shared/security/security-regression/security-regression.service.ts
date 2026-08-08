/**
 * SecurityRegressionService — automated security regression assessment only.
 * Never destructive, never mutates production data, never exposes secrets.
 */

import { randomUUID } from "node:crypto";

import { logger } from "../logger.js";
import { securityMonitoringService } from "../monitoring/index.js";
import { THREAT_DETECTION_TYPES } from "../monitoring/monitoring.types.js";
import {
  getSecurityRegressionConfig,
  isSecurityRegressionEnabled,
} from "./security-regression.config.js";
import {
  buildExecutiveSummary,
  buildRecommendations,
  computeCoverage,
  computeDeploymentReadiness,
  computeOverallHealth,
  runRegressionAssessments,
  summarizeRisk,
} from "./security-regression.engine.js";
import {
  getSecurityRegressionState,
  listSecurityRegressionHistory,
  setLastSecurityRegressionReport,
  setNextSecurityRegressionAt,
} from "./security-regression.state.js";
import {
  SECURITY_REGRESSION_CATEGORIES,
  SECURITY_REGRESSION_EVENTS,
  type SecurityRegressionDashboardMetrics,
  type SecurityRegressionHistoryEntry,
  type SecurityRegressionReport,
  type SecurityRegressionStatusSnapshot,
  type SecurityRegressionTestType,
} from "./security-regression.types.js";

function emitLog(
  event: string,
  metadata: Record<string, unknown> = {},
): void {
  logger.info(`[security-regression] ${event}`, metadata);
}

function emitMonitoring(
  type:
    | typeof THREAT_DETECTION_TYPES.SECURITY_REGRESSION_STARTED
    | typeof THREAT_DETECTION_TYPES.SECURITY_REGRESSION_COMPLETED
    | typeof THREAT_DETECTION_TYPES.SECURITY_REGRESSION_FAILED
    | typeof THREAT_DETECTION_TYPES.SECURITY_CONTROL_FAILED
    | typeof THREAT_DETECTION_TYPES.DEPLOYMENT_NOT_READY,
  message: string,
  metadata?: Record<string, unknown>,
): void {
  void securityMonitoringService.reportSecurityRegressionEvent({
    type,
    resource: "security_regression",
    message,
    metadata: {
      ...metadata,
      sanitized: true,
      assessmentOnly: true,
    },
  });
}

class SecurityRegressionService {
  async getStatus(): Promise<SecurityRegressionStatusSnapshot> {
    const state = getSecurityRegressionState();
    const last = state.lastReport;
    return {
      enabled: isSecurityRegressionEnabled(),
      overallHealth: last?.overallHealth ?? 0,
      coverage: last?.coverage ?? 0,
      failedControls: last?.failedControls ?? 0,
      criticalIssues: last?.criticalIssues ?? 0,
      deploymentReadinessScore: last?.deploymentReadinessScore ?? 0,
      recommendations: last?.recommendations.length ?? 0,
      lastAssessmentAt: last?.completedAt ?? null,
      nextAssessmentAt: state.nextAssessmentAt,
      evaluatedAt: new Date().toISOString(),
    };
  }

  async getReport(): Promise<SecurityRegressionReport | null> {
    return getSecurityRegressionState().lastReport;
  }

  getHistory(limit?: number): SecurityRegressionHistoryEntry[] {
    return listSecurityRegressionHistory(limit);
  }

  getDashboardMetrics(): SecurityRegressionDashboardMetrics {
    const state = getSecurityRegressionState();
    const last = state.lastReport;
    return {
      overallHealth: last?.overallHealth ?? 0,
      coverage: last?.coverage ?? 0,
      failedControls: last?.failedControls ?? 0,
      deploymentReadiness: last?.deploymentReadinessScore ?? 0,
      recommendations: last?.recommendations.length ?? 0,
      history: state.history.length,
      lastAssessmentAt: last?.completedAt ?? null,
    };
  }

  /**
   * Run a non-destructive security regression assessment.
   */
  async runAssessment(input: {
    testType: SecurityRegressionTestType;
    triggeredBy?: string | null;
  }): Promise<SecurityRegressionReport> {
    const cfg = getSecurityRegressionConfig();
    const runId = randomUUID();
    const startedAt = new Date();

    emitLog(SECURITY_REGRESSION_EVENTS.SECURITY_REGRESSION_STARTED, {
      runId,
      testType: input.testType,
      assessmentOnly: true,
    });
    emitMonitoring(
      THREAT_DETECTION_TYPES.SECURITY_REGRESSION_STARTED,
      "Security regression assessment started",
      { runId, testType: input.testType },
    );

    try {
      const findings = await runRegressionAssessments(input.testType);
      const riskSummary = summarizeRisk(findings);
      const overallHealth = computeOverallHealth(findings);
      const coverage = computeCoverage(findings);
      const passedControls = findings.filter((f) => f.status === "PASSED")
        .length;
      const failedControls = findings.filter((f) => f.status === "FAILED")
        .length;
      const warningControls = findings.filter(
        (f) => f.status === "WARNING",
      ).length;
      const criticalIssues = findings.filter(
        (f) =>
          (f.status === "FAILED" || f.status === "WARNING") &&
          f.severity === "CRITICAL",
      ).length;
      const deploymentReadinessScore = computeDeploymentReadiness(
        overallHealth,
        criticalIssues,
        failedControls,
        cfg.readinessThreshold,
      );
      const ready = deploymentReadinessScore >= cfg.readinessThreshold;
      const recommendations = buildRecommendations(findings);

      for (const f of findings) {
        if (f.status === "FAILED") {
          emitMonitoring(
            THREAT_DETECTION_TYPES.SECURITY_CONTROL_FAILED,
            f.title,
            {
              runId,
              controlId: f.controlId,
              category: f.category,
              severity: f.severity,
            },
          );
        }
      }

      if (!ready) {
        emitMonitoring(
          THREAT_DETECTION_TYPES.DEPLOYMENT_NOT_READY,
          "Deployment readiness below threshold",
          {
            runId,
            deploymentReadinessScore,
            threshold: cfg.readinessThreshold,
            criticalIssues,
            failedControls,
          },
        );
      }

      const completedAt = new Date();
      const nextAssessmentAt = new Date(
        completedAt.getTime() + cfg.scheduleIntervalMs,
      ).toISOString();

      const report: SecurityRegressionReport = {
        runId,
        testType: input.testType,
        overallHealth,
        coverage,
        deploymentReadinessScore,
        passedControls,
        failedControls,
        warningControls,
        criticalIssues,
        findings,
        riskSummary,
        recommendations,
        executiveSummary: buildExecutiveSummary({
          health: overallHealth,
          coverage,
          passed: passedControls,
          failed: failedControls,
          critical: criticalIssues,
          readiness: deploymentReadinessScore,
          ready,
        }),
        categoriesAssessed: SECURITY_REGRESSION_CATEGORIES.length,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        triggeredBy: input.triggeredBy ?? null,
        nextAssessmentAt,
        assessmentOnly: true,
      };

      setLastSecurityRegressionReport(report, cfg.historyLimit);
      setNextSecurityRegressionAt(nextAssessmentAt);

      if (failedControls > 0 && criticalIssues > 0) {
        emitLog(SECURITY_REGRESSION_EVENTS.SECURITY_REGRESSION_FAILED, {
          runId,
          overallHealth,
          failedControls,
          criticalIssues,
        });
        emitMonitoring(
          THREAT_DETECTION_TYPES.SECURITY_REGRESSION_FAILED,
          "Security regression assessment found critical failures",
          { runId, overallHealth, failedControls, criticalIssues },
        );
      } else {
        emitLog(SECURITY_REGRESSION_EVENTS.SECURITY_REGRESSION_COMPLETED, {
          runId,
          overallHealth,
          coverage,
          deploymentReadinessScore,
          assessmentOnly: true,
        });
        emitMonitoring(
          THREAT_DETECTION_TYPES.SECURITY_REGRESSION_COMPLETED,
          "Security regression assessment completed",
          {
            runId,
            overallHealth,
            coverage,
            deploymentReadinessScore,
            ready,
          },
        );
      }

      return report;
    } catch (error) {
      emitLog(SECURITY_REGRESSION_EVENTS.SECURITY_REGRESSION_FAILED, {
        runId,
        error: error instanceof Error ? error.message : "Assessment failed",
      });
      emitMonitoring(
        THREAT_DETECTION_TYPES.SECURITY_REGRESSION_FAILED,
        "Security regression assessment failed",
        {
          runId,
          error: error instanceof Error ? error.message : "Assessment failed",
        },
      );
      throw error;
    }
  }
}

export const securityRegressionService = new SecurityRegressionService();
