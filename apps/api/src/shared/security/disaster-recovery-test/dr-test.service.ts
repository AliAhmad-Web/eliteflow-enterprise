/**
 * Disaster Recovery Test Service — simulation-only validation of BCDR.
 * Never executes destructive recovery, deletes data, or creates backups.
 */

import { randomUUID } from "node:crypto";

import { businessContinuityService } from "../bcdr/business-continuity.service.js";
import {
  capabilitiesForMode,
  evaluateAutomaticRecoveryMode,
} from "../bcdr/bcdr.policies.js";
import type { BcdrHealthStatus, BcdrServiceId } from "../bcdr/bcdr.types.js";
import { recoveryPolicyService } from "../bcdr/recovery-policy.service.js";
import { logger } from "../logger.js";
import { securityMonitoringService } from "../monitoring/index.js";
import { getDrTestConfig, isDrTestEnabled } from "./dr-test.config.js";
import {
  aggregateDrStatus,
  buildRecommendations,
  CATEGORY_TO_SERVICE,
  simulateBusinessContinuityCategory,
  simulateMonitoringCategory,
  simulateRecoveryModeCategory,
  simulateServiceCategory,
} from "./dr-test.engine.js";
import {
  getDrTestState,
  listDrTestHistory,
  setLastDrTestReport,
  setNextDrTestAt,
} from "./dr-test.state.js";
import {
  DR_TEST_CATEGORIES,
  DR_TEST_EVENTS,
  type DrCategoryResult,
  type DrTestDashboardMetrics,
  type DrTestHistoryEntry,
  type DrTestReport,
  type DrTestStatusSnapshot,
  type DrTestType,
} from "./dr-test.types.js";

function emitEvent(
  event: string,
  metadata: Record<string, unknown> = {},
): void {
  logger.info(`[disaster-recovery-test] ${event}`, metadata);
}

class DisasterRecoveryTestService {
  async getStatus(): Promise<DrTestStatusSnapshot> {
    const state = getDrTestState();
    const last = state.lastReport;
    return {
      enabled: isDrTestEnabled(),
      status: last?.status ?? "NOT_TESTED",
      readiness: last?.overallReadiness ?? 0,
      successRate: last?.successRate ?? 0,
      lastTestAt: last?.completedAt ?? null,
      lastRecoveryDurationMs: last?.recoveryDurationMs ?? null,
      recommendations: last?.recommendations.length ?? 0,
      nextTestAt: state.nextTestAt,
      evaluatedAt: new Date().toISOString(),
    };
  }

  async getReport(): Promise<DrTestReport | null> {
    return getDrTestState().lastReport;
  }

  getHistory(limit?: number): DrTestHistoryEntry[] {
    return listDrTestHistory(limit);
  }

  getDashboardMetrics(): DrTestDashboardMetrics {
    const last = getDrTestState().lastReport;
    return {
      readiness: last?.overallReadiness ?? 0,
      lastTestAt: last?.completedAt ?? null,
      successRate: last?.successRate ?? 0,
      recoveryTimeMs: last?.recoveryDurationMs ?? null,
      recommendations: last?.recommendations.length ?? 0,
    };
  }

  /**
   * Run a non-destructive disaster recovery simulation.
   * Does not failover, restore, delete, or mutate production business data.
   */
  async runTest(input: {
    testType: DrTestType;
    triggeredBy?: string | null;
  }): Promise<DrTestReport> {
    const cfg = getDrTestConfig();
    const runId = randomUUID();
    const startedAt = new Date();
    const testType = input.testType;

    emitEvent(DR_TEST_EVENTS.DISASTER_RECOVERY_TEST_STARTED, {
      runId,
      testType,
      simulationOnly: true,
    });

    try {
      const probeStarted = Date.now();
      const snapshot = await businessContinuityService.getStatus();
      const totalProbeMs = Date.now() - probeStarted;

      const healthById = new Map(
        snapshot.serviceHealth.map((h) => [h.id, h]),
      );

      // Per-service simulated timing share of total probe (never real restore).
      const perServiceMs = Math.max(
        1,
        Math.round(totalProbeMs / Math.max(snapshot.serviceHealth.length, 1)),
      );

      const categories: DrCategoryResult[] = [];

      for (const category of DR_TEST_CATEGORIES) {
        if (category === "SECURITY_MONITORING_RECOVERY") {
          const available =
            typeof securityMonitoringService.report === "function";
          categories.push(simulateMonitoringCategory(available));
          continue;
        }

        if (category === "BUSINESS_CONTINUITY_VALIDATION") {
          const criticalHealthy = snapshot.serviceHealth
            .filter((s) => s.critical)
            .every(
              (s) => s.status === "HEALTHY" || s.status === "MAINTENANCE",
            );
          categories.push(
            simulateBusinessContinuityCategory({
              readinessScore: snapshot.recoveryReadinessScore,
              criticalHealthy,
              activeDegradations: snapshot.activeDegradations.length,
            }),
          );
          continue;
        }

        if (category === "RECOVERY_MODE_VALIDATION") {
          const healthMap = Object.fromEntries(
            snapshot.serviceHealth.map((s) => [s.id, s.status]),
          ) as Record<BcdrServiceId, BcdrHealthStatus>;
          const automatic = evaluateAutomaticRecoveryMode(healthMap);
          const caps = recoveryPolicyService.getCapabilities();
          const expectedCaps = capabilitiesForMode(snapshot.recoveryMode);
          const capabilitiesValid =
            caps.allowWrites === expectedCaps.allowWrites &&
            caps.allowFileUploads === expectedCaps.allowFileUploads;
          const policyConsistent =
            snapshot.manualOverride ||
            automatic.mode === snapshot.recoveryMode;

          categories.push(
            simulateRecoveryModeCategory({
              recoveryMode: snapshot.recoveryMode,
              capabilitiesValid,
              policyConsistent,
            }),
          );
          continue;
        }

        const serviceId = CATEGORY_TO_SERVICE[category];
        const health = serviceId ? healthById.get(serviceId) ?? null : null;
        const result = simulateServiceCategory({
          category,
          health,
          probeMs: perServiceMs,
          testType,
        });
        categories.push(result);

        if (
          result.checks.some(
            (c) => c.name === "rto_validation" && c.status === "FAIL",
          )
        ) {
          emitEvent(DR_TEST_EVENTS.RECOVERY_TIMEOUT, {
            runId,
            category,
          });
        }
      }

      if (testType === "DRY_RUN") {
        // Dry run never escalates beyond WARNING for non-critical fails
        for (const cat of categories) {
          if (
            cat.status === "FAILED" &&
            cat.category !== "DATABASE_RECOVERY" &&
            cat.category !== "AUTHENTICATION_RECOVERY" &&
            cat.category !== "BUSINESS_CONTINUITY_VALIDATION"
          ) {
            cat.status = "WARNING";
          }
        }
      }

      const status = aggregateDrStatus(categories);
      const tested = categories.filter((c) => c.status !== "NOT_TESTED");
      const passed = tested.filter(
        (c) => c.status === "PASSED" || c.status === "WARNING",
      ).length;
      const successRate =
        tested.length === 0
          ? 0
          : Math.round((passed / tested.length) * 100);

      const failedComponents = categories
        .filter((c) => c.status === "FAILED")
        .map((c) => c.category);

      if (failedComponents.includes("BUSINESS_CONTINUITY_VALIDATION")) {
        emitEvent(DR_TEST_EVENTS.BUSINESS_CONTINUITY_FAILURE, { runId });
      }
      if (failedComponents.length > 0) {
        emitEvent(DR_TEST_EVENTS.RECOVERY_VALIDATION_FAILED, {
          runId,
          failedComponents,
        });
      }

      const recommendations = buildRecommendations(categories);
      const completedAt = new Date();
      const nextTestAt = new Date(
        completedAt.getTime() + cfg.scheduleIntervalMs,
      ).toISOString();

      const criticalServicesHealthy = snapshot.serviceHealth
        .filter((s) => s.critical)
        .every((s) => s.status === "HEALTHY" || s.status === "MAINTENANCE");

      const report: DrTestReport = {
        runId,
        testType,
        status:
          status === "PASSED" && snapshot.recoveryReadinessScore < 50
            ? "WARNING"
            : status === "NOT_TESTED"
              ? "READY"
              : status,
        overallReadiness: snapshot.recoveryReadinessScore,
        successRate,
        recoveryDurationMs: totalProbeMs,
        failedComponents,
        recommendations,
        categories,
        recoveryMode: snapshot.recoveryMode,
        criticalServicesHealthy,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        triggeredBy: input.triggeredBy ?? null,
        nextTestAt,
        simulationOnly: true,
      };

      // READY means framework is enabled and ready when no prior failures in dry sense
      if (report.status === "PASSED" && testType === "DRY_RUN") {
        // keep PASSED
      }

      setLastDrTestReport(report, cfg.historyLimit);
      setNextDrTestAt(nextTestAt);

      if (report.status === "FAILED") {
        emitEvent(DR_TEST_EVENTS.DISASTER_RECOVERY_TEST_FAILED, {
          runId,
          readiness: report.overallReadiness,
          successRate: report.successRate,
        });
      } else {
        emitEvent(DR_TEST_EVENTS.DISASTER_RECOVERY_TEST_SUCCESS, {
          runId,
          readiness: report.overallReadiness,
          successRate: report.successRate,
        });
      }

      return report;
    } catch (error) {
      emitEvent(DR_TEST_EVENTS.DISASTER_RECOVERY_TEST_FAILED, {
        runId,
        error: error instanceof Error ? error.message : "DR test failed",
      });
      throw error;
    }
  }
}

export const disasterRecoveryTestService = new DisasterRecoveryTestService();
