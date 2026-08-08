/**
 * Enterprise Backup Validation — shared types.
 * Validation only — no backup creation or restore execution.
 */

export const BACKUP_TARGET_CATEGORIES = [
  "DATABASE",
  "FILE_STORAGE",
  "DOCUMENTS",
  "AI_CONFIG",
  "SECRETS",
  "UPLOADS",
  "APPLICATION",
] as const;

export type BackupTargetCategory =
  (typeof BACKUP_TARGET_CATEGORIES)[number];

export const BACKUP_HEALTH_STATUSES = [
  "HEALTHY",
  "WARNING",
  "FAILED",
  "UNKNOWN",
] as const;

export type BackupHealthStatus = (typeof BACKUP_HEALTH_STATUSES)[number];

export const BACKUP_VALIDATION_TYPES = [
  "AUTOMATIC",
  "MANUAL",
  "INCREMENTAL",
  "FULL",
] as const;

export type BackupValidationType =
  (typeof BACKUP_VALIDATION_TYPES)[number];

export const BACKUP_CHECK_IDS = [
  "BACKUP_EXISTS",
  "BACKUP_CHECKSUM",
  "BACKUP_ENCRYPTION",
  "BACKUP_AGE",
  "BACKUP_INTEGRITY",
  "RESTORE_METADATA",
  "MISSING_FILES",
  "SNAPSHOT_CONSISTENCY",
  "RETENTION_POLICY",
  "EXPIRED_BACKUPS",
  "CORRUPTED_BACKUPS",
] as const;

export type BackupCheckId = (typeof BACKUP_CHECK_IDS)[number];

export const BACKUP_VALIDATION_EVENTS = {
  BACKUP_VALIDATION_STARTED: "BACKUP_VALIDATION_STARTED",
  BACKUP_VALIDATION_SUCCESS: "BACKUP_VALIDATION_SUCCESS",
  BACKUP_VALIDATION_FAILED: "BACKUP_VALIDATION_FAILED",
  BACKUP_CORRUPTED: "BACKUP_CORRUPTED",
  BACKUP_EXPIRED: "BACKUP_EXPIRED",
  BACKUP_MISSING: "BACKUP_MISSING",
  BACKUP_ENCRYPTION_FAILED: "BACKUP_ENCRYPTION_FAILED",
} as const;

export type BackupValidationEvent =
  (typeof BACKUP_VALIDATION_EVENTS)[keyof typeof BACKUP_VALIDATION_EVENTS];

export type BackupCheckResultStatus = "PASS" | "WARN" | "FAIL" | "SKIP";

export interface BackupCheckResult {
  checkId: BackupCheckId;
  status: BackupCheckResultStatus;
  message: string;
  /** Non-sensitive evidence only */
  evidence?: Record<string, unknown>;
}

export interface BackupTargetSnapshot {
  category: BackupTargetCategory;
  label: string;
  /** Opaque id — never a secret */
  targetId: string;
  recordId: string | null;
  status: string | null;
  hasChecksum: boolean;
  hasStorageKey: boolean;
  hasSize: boolean;
  ageHours: number | null;
  completedAt: string | null;
  createdAt: string | null;
}

export interface CategoryValidationResult {
  category: BackupTargetCategory;
  health: BackupHealthStatus;
  checks: BackupCheckResult[];
  targetCount: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
}

export interface BackupValidationReport {
  runId: string;
  validationType: BackupValidationType;
  health: BackupHealthStatus;
  totalBackups: number;
  successful: number;
  failed: number;
  expired: number;
  corrupted: number;
  encryptionStatus: "ENCRYPTED" | "PARTIAL" | "UNENCRYPTED" | "UNKNOWN";
  coveragePercent: number;
  categories: CategoryValidationResult[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
  triggeredBy: string | null;
  nextValidationAt: string | null;
}

export interface BackupValidationStatusSnapshot {
  enabled: boolean;
  health: BackupHealthStatus;
  coveragePercent: number;
  failures: number;
  lastValidationAt: string | null;
  nextValidationAt: string | null;
  lastValidationType: BackupValidationType | null;
  totalBackups: number;
  encryptionStatus: "ENCRYPTED" | "PARTIAL" | "UNENCRYPTED" | "UNKNOWN";
  evaluatedAt: string;
}

export interface BackupValidationHistoryEntry {
  runId: string;
  validationType: BackupValidationType;
  health: BackupHealthStatus;
  coveragePercent: number;
  failures: number;
  completedAt: string;
  triggeredBy: string | null;
}

export interface BackupValidationDashboardMetrics {
  status: BackupHealthStatus;
  coverage: number;
  health: BackupHealthStatus;
  failures: number;
  lastValidationAt: string | null;
  nextValidationAt: string | null;
}

/** Sanitized metadata used by validators — never includes secrets. */
export interface BackupMetadataItem {
  id: string;
  category: BackupTargetCategory;
  type: string;
  status: string;
  storageKey: string | null;
  sizeBytes: string | null;
  checksum: string | null;
  message: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}
