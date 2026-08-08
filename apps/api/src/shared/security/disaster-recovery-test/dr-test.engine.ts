/**
 * DR category simulations — probe health only; never mutate or restore data.
 */

import type { BcdrServiceHealth, BcdrServiceId } from "../bcdr/bcdr.types.js";
import { getDrTestConfig } from "./dr-test.config.js";
import type {
  DrCategoryResult,
  DrCheckResultStatus,
  DrTestCategory,
  DrTestRecommendation,
  DrTestStatus,
  DrTestType,
} from "./dr-test.types.js";

const CATEGORY_TO_SERVICE: Partial<Record<DrTestCategory, BcdrServiceId>> = {
  DATABASE_RECOVERY: "database",
  STORAGE_RECOVERY: "file_storage",
  REDIS_RECOVERY: "cache",
  AI_RECOVERY: "ai_providers",
  EMAIL_RECOVERY: "email_service",
  AUTHENTICATION_RECOVERY: "authentication",
  BACKGROUND_JOBS_RECOVERY: "background_jobs",
};

function healthToCheckStatus(
  status: BcdrServiceHealth["status"],
): DrCheckResultStatus {
  switch (status) {
    case "HEALTHY":
      return "PASS";
    case "MAINTENANCE":
    case "DEGRADED":
      return "WARN";
    case "UNAVAILABLE":
      return "FAIL";
    default:
      return "FAIL";
  }
}

function categoryStatusFromChecks(
  checks: Array<{ status: DrCheckResultStatus }>,
): DrTestStatus {
  if (checks.some((c) => c.status === "FAIL")) return "FAILED";
  if (checks.some((c) => c.status === "WARN")) return "WARNING";
  if (checks.every((c) => c.status === "SKIP")) return "NOT_TESTED";
  return "PASSED";
}

function rtoForCategory(category: DrTestCategory, critical: boolean): number {
  const cfg = getDrTestConfig();
  if (
    category === "DATABASE_RECOVERY" ||
    category === "AUTHENTICATION_RECOVERY" ||
    critical
  ) {
    return cfg.criticalRtoMs;
  }
  return cfg.defaultRtoMs;
}

export function simulateServiceCategory(input: {
  category: DrTestCategory;
  health: BcdrServiceHealth | null;
  probeMs: number;
  testType: DrTestType;
}): DrCategoryResult {
  const cfg = getDrTestConfig();
  const { category, health, probeMs, testType } = input;

  if (testType === "PARTIAL" && health && !health.critical) {
    return {
      category,
      status: "NOT_TESTED",
      recoveryTimeMs: 0,
      rtoTargetMs: rtoForCategory(category, false),
      rpoTargetMs: cfg.defaultRpoMs,
      rtoMet: true,
      rpoMet: true,
      message: "Skipped in PARTIAL test (non-critical)",
      checks: [
        {
          name: "partial_skip",
          status: "SKIP",
          message: "Non-critical category skipped for PARTIAL test",
        },
      ],
    };
  }

  if (!health) {
    return {
      category,
      status: "NOT_TESTED",
      recoveryTimeMs: 0,
      rtoTargetMs: cfg.defaultRtoMs,
      rpoTargetMs: cfg.defaultRpoMs,
      rtoMet: false,
      rpoMet: false,
      message: "No health evidence for category",
      checks: [
        {
          name: "health_probe",
          status: "SKIP",
          message: "Service health not available",
        },
      ],
    };
  }

  const rtoTargetMs = rtoForCategory(category, health.critical);
  const timedOut = probeMs > cfg.probeTimeoutMs;
  const rtoMet = !timedOut && probeMs <= rtoTargetMs;
  // RPO proxy: healthy services assumed within RPO; unavailable fails RPO.
  const rpoMet = health.status === "HEALTHY" || health.status === "MAINTENANCE";

  const checks: DrCategoryResult["checks"] = [
    {
      name: "health_restoration",
      status: healthToCheckStatus(health.status),
      message: `Service ${health.id} status=${health.status}`,
    },
    {
      name: "rto_validation",
      status: timedOut ? "FAIL" : rtoMet ? "PASS" : "WARN",
      message: timedOut
        ? `Probe exceeded timeout ${cfg.probeTimeoutMs}ms`
        : `Probe ${probeMs}ms vs RTO ${rtoTargetMs}ms`,
    },
    {
      name: "rpo_validation",
      status: rpoMet ? "PASS" : "FAIL",
      message: rpoMet
        ? `RPO proxy within ${cfg.defaultRpoMs}ms policy`
        : "Service unavailable — RPO objective not met (simulation)",
    },
    {
      name: "dependency_check",
      status: health.critical && health.status === "UNAVAILABLE" ? "FAIL" : "PASS",
      message: health.critical
        ? `Critical dependency ${health.id}`
        : `Non-critical dependency ${health.id}`,
    },
  ];

  return {
    category,
    status: categoryStatusFromChecks(checks),
    recoveryTimeMs: probeMs,
    rtoTargetMs,
    rpoTargetMs: cfg.defaultRpoMs,
    rtoMet,
    rpoMet,
    message: health.detail ?? `Simulated recovery validation for ${category}`,
    checks,
  };
}

export function simulateMonitoringCategory(monitoringAvailable: boolean): DrCategoryResult {
  const cfg = getDrTestConfig();
  const checks: DrCategoryResult["checks"] = [
    {
      name: "security_monitoring_available",
      status: monitoringAvailable ? "PASS" : "FAIL",
      message: monitoringAvailable
        ? "SecurityMonitoringService report API present"
        : "Security monitoring not available",
    },
  ];
  return {
    category: "SECURITY_MONITORING_RECOVERY",
    status: categoryStatusFromChecks(checks),
    recoveryTimeMs: 0,
    rtoTargetMs: cfg.defaultRtoMs,
    rpoTargetMs: cfg.defaultRpoMs,
    rtoMet: true,
    rpoMet: monitoringAvailable,
    message: "Security monitoring recovery simulation",
    checks,
  };
}

export function simulateBusinessContinuityCategory(input: {
  readinessScore: number;
  criticalHealthy: boolean;
  activeDegradations: number;
}): DrCategoryResult {
  const cfg = getDrTestConfig();
  const checks: DrCategoryResult["checks"] = [
    {
      name: "readiness_score",
      status:
        input.readinessScore >= 70
          ? "PASS"
          : input.readinessScore >= 50
            ? "WARN"
            : "FAIL",
      message: `Readiness score ${input.readinessScore}`,
    },
    {
      name: "critical_services",
      status: input.criticalHealthy ? "PASS" : "FAIL",
      message: input.criticalHealthy
        ? "All critical services healthy or in maintenance"
        : "One or more critical services unavailable",
    },
    {
      name: "active_degradations",
      status:
        input.activeDegradations === 0
          ? "PASS"
          : input.activeDegradations <= 2
            ? "WARN"
            : "FAIL",
      message: `${input.activeDegradations} active degradation(s)`,
    },
  ];
  return {
    category: "BUSINESS_CONTINUITY_VALIDATION",
    status: categoryStatusFromChecks(checks),
    recoveryTimeMs: 0,
    rtoTargetMs: cfg.defaultRtoMs,
    rpoTargetMs: cfg.defaultRpoMs,
    rtoMet: true,
    rpoMet: input.criticalHealthy,
    message: "Business continuity policy validation (simulation)",
    checks,
  };
}

export function simulateRecoveryModeCategory(input: {
  recoveryMode: string;
  capabilitiesValid: boolean;
  policyConsistent: boolean;
}): DrCategoryResult {
  const cfg = getDrTestConfig();
  const checks: DrCategoryResult["checks"] = [
    {
      name: "recovery_mode_present",
      status: input.recoveryMode ? "PASS" : "FAIL",
      message: `Recovery mode=${input.recoveryMode || "missing"}`,
    },
    {
      name: "capabilities_valid",
      status: input.capabilitiesValid ? "PASS" : "FAIL",
      message: input.capabilitiesValid
        ? "Recovery capabilities consistent with mode"
        : "Recovery capabilities inconsistent",
    },
    {
      name: "policy_validation",
      status: input.policyConsistent ? "PASS" : "WARN",
      message: input.policyConsistent
        ? "Automatic policy evaluation consistent"
        : "Policy evaluation mismatch detected",
    },
  ];
  return {
    category: "RECOVERY_MODE_VALIDATION",
    status: categoryStatusFromChecks(checks),
    recoveryTimeMs: 0,
    rtoTargetMs: cfg.defaultRtoMs,
    rpoTargetMs: cfg.defaultRpoMs,
    rtoMet: true,
    rpoMet: true,
    message: "Recovery mode validation (no mode change applied)",
    checks,
  };
}

export function aggregateDrStatus(categories: DrCategoryResult[]): DrTestStatus {
  const tested = categories.filter((c) => c.status !== "NOT_TESTED");
  if (tested.length === 0) return "NOT_TESTED";
  if (tested.some((c) => c.status === "FAILED")) return "FAILED";
  if (tested.some((c) => c.status === "WARNING")) return "WARNING";
  return "PASSED";
}

export function buildRecommendations(
  categories: DrCategoryResult[],
): DrTestRecommendation[] {
  const recs: DrTestRecommendation[] = [];
  for (const cat of categories) {
    if (cat.status === "FAILED") {
      recs.push({
        severity: "CRITICAL",
        code: `REMEDIATE_${cat.category}`,
        message: `Address failures in ${cat.category} (simulation — no automatic remediation)`,
      });
    } else if (cat.status === "WARNING") {
      recs.push({
        severity: "WARN",
        code: `REVIEW_${cat.category}`,
        message: `Review degraded signals for ${cat.category}`,
      });
    }
    if (!cat.rtoMet && cat.status !== "NOT_TESTED") {
      recs.push({
        severity: "WARN",
        code: "RTO_TARGET",
        message: `${cat.category} probe exceeded RTO target ${cat.rtoTargetMs}ms`,
      });
    }
  }
  if (recs.length === 0) {
    recs.push({
      severity: "INFO",
      code: "READY",
      message: "Disaster recovery simulation passed — continue scheduled tests",
    });
  }
  return recs;
}

export { CATEGORY_TO_SERVICE };
