/**
 * Enterprise Disaster Recovery Test — shared types.
 * Simulation only — never destructive, never modifies production data.
 */

export const DR_TEST_CATEGORIES = [
  "DATABASE_RECOVERY",
  "STORAGE_RECOVERY",
  "REDIS_RECOVERY",
  "AI_RECOVERY",
  "EMAIL_RECOVERY",
  "AUTHENTICATION_RECOVERY",
  "BACKGROUND_JOBS_RECOVERY",
  "SECURITY_MONITORING_RECOVERY",
  "BUSINESS_CONTINUITY_VALIDATION",
  "RECOVERY_MODE_VALIDATION",
] as const;

export type DrTestCategory = (typeof DR_TEST_CATEGORIES)[number];

export const DR_TEST_TYPES = [
  "DRY_RUN",
  "MANUAL",
  "SCHEDULED",
  "PARTIAL",
  "FULL_RECOVERY_SIMULATION",
] as const;

export type DrTestType = (typeof DR_TEST_TYPES)[number];

export const DR_TEST_STATUSES = [
  "READY",
  "PASSED",
  "WARNING",
  "FAILED",
  "NOT_TESTED",
] as const;

export type DrTestStatus = (typeof DR_TEST_STATUSES)[number];

export const DR_TEST_EVENTS = {
  DISASTER_RECOVERY_TEST_STARTED: "DISASTER_RECOVERY_TEST_STARTED",
  DISASTER_RECOVERY_TEST_SUCCESS: "DISASTER_RECOVERY_TEST_SUCCESS",
  DISASTER_RECOVERY_TEST_FAILED: "DISASTER_RECOVERY_TEST_FAILED",
  RECOVERY_TIMEOUT: "RECOVERY_TIMEOUT",
  RECOVERY_VALIDATION_FAILED: "RECOVERY_VALIDATION_FAILED",
  BUSINESS_CONTINUITY_FAILURE: "BUSINESS_CONTINUITY_FAILURE",
} as const;

export type DrTestEvent =
  (typeof DR_TEST_EVENTS)[keyof typeof DR_TEST_EVENTS];

export type DrCheckResultStatus = "PASS" | "WARN" | "FAIL" | "SKIP";

export interface DrCategoryResult {
  category: DrTestCategory;
  status: DrTestStatus;
  /** Simulated probe / validation duration in ms (not real failover). */
  recoveryTimeMs: number;
  rtoTargetMs: number;
  rpoTargetMs: number;
  rtoMet: boolean;
  rpoMet: boolean;
  message: string;
  checks: Array<{
    name: string;
    status: DrCheckResultStatus;
    message: string;
  }>;
}

export interface DrTestRecommendation {
  severity: "INFO" | "WARN" | "CRITICAL";
  code: string;
  message: string;
}

export interface DrTestReport {
  runId: string;
  testType: DrTestType;
  status: DrTestStatus;
  overallReadiness: number;
  successRate: number;
  recoveryDurationMs: number;
  failedComponents: string[];
  recommendations: DrTestRecommendation[];
  categories: DrCategoryResult[];
  recoveryMode: string;
  criticalServicesHealthy: boolean;
  startedAt: string;
  completedAt: string;
  triggeredBy: string | null;
  nextTestAt: string | null;
  /** Always true — framework is simulation-only. */
  simulationOnly: true;
}

export interface DrTestStatusSnapshot {
  enabled: boolean;
  status: DrTestStatus;
  readiness: number;
  successRate: number;
  lastTestAt: string | null;
  lastRecoveryDurationMs: number | null;
  recommendations: number;
  nextTestAt: string | null;
  evaluatedAt: string;
}

export interface DrTestHistoryEntry {
  runId: string;
  testType: DrTestType;
  status: DrTestStatus;
  overallReadiness: number;
  successRate: number;
  recoveryDurationMs: number;
  completedAt: string;
  triggeredBy: string | null;
}

export interface DrTestDashboardMetrics {
  readiness: number;
  lastTestAt: string | null;
  successRate: number;
  recoveryTimeMs: number | null;
  recommendations: number;
}
