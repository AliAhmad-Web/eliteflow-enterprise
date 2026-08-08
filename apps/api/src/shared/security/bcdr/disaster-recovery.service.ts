import { writeAuditLogSafe } from "../write-audit-log.js";
import { businessContinuityService } from "./business-continuity.service.js";
import {
  capabilitiesForMode,
  computeReadinessScore,
  evaluateAutomaticRecoveryMode,
} from "./bcdr.policies.js";
import {
  effectiveMode,
  getBcdrState,
  setLastRecoveryTest,
  setManualRecoveryMode,
} from "./bcdr.state.js";
import type {
  BcdrRecoveryMode,
  BcdrRecoveryTestResult,
  BcdrServiceId,
} from "./bcdr.types.js";
import { recoveryPolicyService } from "./recovery-policy.service.js";

const AUDIT_RESOURCE = "business_continuity";

/**
 * Disaster recovery orchestration — tests, mode changes, coordination.
 * Does not perform infrastructure failover or real backups.
 */
class DisasterRecoveryService {
  async runRecoveryTest(actorUserId?: string | null): Promise<BcdrRecoveryTestResult> {
    const status = await businessContinuityService.getStatus();
    const checks = status.serviceHealth.map((s) => ({
      name: s.id,
      ok: s.status === "HEALTHY" || s.status === "MAINTENANCE",
      detail: s.detail ?? undefined,
    }));

    const criticalFailed = status.serviceHealth.filter(
      (s) => s.critical && s.status === "UNAVAILABLE",
    );
    const score = status.recoveryReadinessScore;
    const passed = criticalFailed.length === 0 && score >= 50;

    const result: BcdrRecoveryTestResult = {
      testedAt: new Date().toISOString(),
      passed,
      score,
      recoveryMode: status.recoveryMode,
      checks,
      summary: passed
        ? "Recovery readiness test passed — critical dependencies available"
        : "Recovery readiness test failed — critical dependency issues detected",
    };

    setLastRecoveryTest(result);

    await writeAuditLogSafe(
      {
        userId: actorUserId ?? null,
        action: "business_continuity.recovery_test",
        resource: AUDIT_RESOURCE,
        metadata: {
          passed: result.passed,
          score: result.score,
          recoveryMode: result.recoveryMode,
          failedChecks: checks.filter((c) => !c.ok).map((c) => c.name),
        },
      },
      "bcdr",
    );

    return result;
  }

  async setRecoveryMode(input: {
    mode: BcdrRecoveryMode | "AUTO";
    actorUserId?: string | null;
    reason?: string;
  }): Promise<{
    recoveryMode: BcdrRecoveryMode;
    manualOverride: boolean;
    reason: string;
    capabilities: ReturnType<typeof recoveryPolicyService.getCapabilities>;
  }> {
    if (input.mode === "AUTO") {
      setManualRecoveryMode(null);
      // Re-probe to refresh automatic mode.
      await businessContinuityService.probeAllServices();
      const modeInfo = effectiveMode();

      await writeAuditLogSafe(
        {
          userId: input.actorUserId ?? null,
          action: "business_continuity.recovery_mode_auto",
          resource: AUDIT_RESOURCE,
          metadata: {
            recoveryMode: modeInfo.mode,
            reason: modeInfo.reason,
            note: input.reason ?? null,
          },
        },
        "bcdr",
      );

      return {
        recoveryMode: modeInfo.mode,
        manualOverride: false,
        reason: modeInfo.reason,
        capabilities: recoveryPolicyService.getCapabilities(),
      };
    }

    const previous = effectiveMode();
    setManualRecoveryMode(input.mode);

    await writeAuditLogSafe(
      {
        userId: input.actorUserId ?? null,
        action: "business_continuity.recovery_mode_changed",
        resource: AUDIT_RESOURCE,
        metadata: {
          previousMode: previous.mode,
          recoveryMode: input.mode,
          manualOverride: true,
          reason: input.reason ?? "Manual override",
        },
      },
      "bcdr",
    );

    return {
      recoveryMode: input.mode,
      manualOverride: true,
      reason: input.reason ?? "Manual override",
      capabilities: recoveryPolicyService.getCapabilities(),
    };
  }

  getPolicyDecisionPreview() {
    const state = getBcdrState();
    const healthMap = Object.fromEntries(
      state.lastHealth.map((h) => [h.id, h.status]),
    ) as Record<BcdrServiceId, (typeof state.lastHealth)[0]["status"]>;

    const automatic =
      state.lastHealth.length > 0
        ? evaluateAutomaticRecoveryMode(healthMap)
        : { mode: "NORMAL" as const, reason: "No health data yet" };

    return {
      automatic,
      effective: effectiveMode(),
      capabilities: capabilitiesForMode(effectiveMode().mode),
      readinessScore: computeReadinessScore(
        state.lastHealth.map((h) => h.status),
      ),
    };
  }
}

export const disasterRecoveryService = new DisasterRecoveryService();
