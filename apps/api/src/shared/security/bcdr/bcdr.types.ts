export const BCDR_SERVICE_IDS = [
  "database",
  "file_storage",
  "ai_providers",
  "email_service",
  "background_jobs",
  "authentication",
  "cache",
] as const;

export type BcdrServiceId = (typeof BCDR_SERVICE_IDS)[number];

export const BCDR_HEALTH_STATUSES = [
  "HEALTHY",
  "DEGRADED",
  "UNAVAILABLE",
  "MAINTENANCE",
] as const;

export type BcdrHealthStatus = (typeof BCDR_HEALTH_STATUSES)[number];

export const BCDR_RECOVERY_MODES = [
  "NORMAL",
  "READ_ONLY",
  "LIMITED_OPERATION",
  "DISASTER_RECOVERY",
] as const;

export type BcdrRecoveryMode = (typeof BCDR_RECOVERY_MODES)[number];

export interface BcdrServiceHealth {
  id: BcdrServiceId;
  label: string;
  status: BcdrHealthStatus;
  critical: boolean;
  detail: string | null;
  checkedAt: string;
}

export interface BcdrActiveDegradation {
  serviceId: BcdrServiceId;
  status: BcdrHealthStatus;
  detail: string | null;
  since: string;
}

export interface BcdrReadinessSnapshot {
  recoveryMode: BcdrRecoveryMode;
  manualOverride: boolean;
  serviceHealth: BcdrServiceHealth[];
  criticalDependencies: BcdrServiceId[];
  activeDegradations: BcdrActiveDegradation[];
  lastRecoveryTestAt: string | null;
  lastRecoveryTestPassed: boolean | null;
  recoveryReadinessScore: number;
  evaluatedAt: string;
}

export interface BcdrRecoveryTestResult {
  testedAt: string;
  passed: boolean;
  score: number;
  recoveryMode: BcdrRecoveryMode;
  checks: Array<{ name: string; ok: boolean; detail?: string }>;
  summary: string;
}

export interface RecoveryCapabilities {
  allowWrites: boolean;
  allowFileUploads: boolean;
  allowAi: boolean;
  allowEmailSend: boolean;
  allowBackgroundJobs: boolean;
  queueNotificationsOnly: boolean;
  mode: BcdrRecoveryMode;
  reason: string;
}
