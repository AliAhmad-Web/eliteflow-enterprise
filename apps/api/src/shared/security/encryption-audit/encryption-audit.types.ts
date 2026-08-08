/**
 * Enterprise Encryption Audit — shared types.
 * Audit only — no encryption, rotation, or decryption of secrets.
 */

export const ENCRYPTION_AUDIT_SOURCES = [
  "DATABASE",
  "FILES",
  "SECRETS",
  "AI_MEMORY",
  "DOCUMENTS",
  "BACKUPS",
  "SESSIONS",
  "TOKENS",
] as const;

export type EncryptionAuditSource =
  (typeof ENCRYPTION_AUDIT_SOURCES)[number];

export const ENCRYPTION_AUDIT_STATUSES = [
  "HEALTHY",
  "WARNING",
  "FAILED",
  "UNKNOWN",
] as const;

export type EncryptionAuditStatus =
  (typeof ENCRYPTION_AUDIT_STATUSES)[number];

export const ENCRYPTION_AUDIT_CHECK_IDS = [
  "ENCRYPTION_ENABLED",
  "ALGORITHM_VALIDATION",
  "KEY_AVAILABILITY",
  "KEY_LENGTH",
  "KEY_AGE",
  "ENCRYPTED_FIELDS",
  "PLAINTEXT_DETECTION",
  "CONFIGURATION_VALIDATION",
  "SECRETS_PROTECTION",
  "JWT_SIGNING_CONFIGURATION",
  "TLS_CONFIGURATION",
  "AES_CONFIGURATION",
  "HASH_ALGORITHM_VALIDATION",
  "CERTIFICATE_VALIDATION",
] as const;

export type EncryptionAuditCheckId =
  (typeof ENCRYPTION_AUDIT_CHECK_IDS)[number];

export const ENCRYPTION_AUDIT_EVENTS = {
  ENCRYPTION_AUDIT_STARTED: "ENCRYPTION_AUDIT_STARTED",
  ENCRYPTION_AUDIT_SUCCESS: "ENCRYPTION_AUDIT_SUCCESS",
  ENCRYPTION_AUDIT_FAILED: "ENCRYPTION_AUDIT_FAILED",
  WEAK_ENCRYPTION: "WEAK_ENCRYPTION",
  PLAINTEXT_DETECTED: "PLAINTEXT_DETECTED",
  INVALID_KEY_CONFIGURATION: "INVALID_KEY_CONFIGURATION",
  TLS_CONFIGURATION_WARNING: "TLS_CONFIGURATION_WARNING",
  CERTIFICATE_WARNING: "CERTIFICATE_WARNING",
} as const;

export type EncryptionAuditEvent =
  (typeof ENCRYPTION_AUDIT_EVENTS)[keyof typeof ENCRYPTION_AUDIT_EVENTS];

export type EncryptionCheckResultStatus = "PASS" | "WARN" | "FAIL" | "SKIP";

export interface EncryptionCheckResult {
  checkId: EncryptionAuditCheckId;
  status: EncryptionCheckResultStatus;
  message: string;
  /** Sanitized metadata only — never secrets/keys */
  evidence?: Record<string, unknown>;
}

export interface SourceAuditResult {
  source: EncryptionAuditSource;
  status: EncryptionAuditStatus;
  encryptedAssets: number;
  unencryptedAssets: number;
  checks: EncryptionCheckResult[];
}

export interface EncryptionAuditRecommendation {
  severity: "INFO" | "WARN" | "CRITICAL";
  code: string;
  message: string;
}

export interface EncryptionAuditReport {
  runId: string;
  status: EncryptionAuditStatus;
  overallScore: number;
  encryptedAssets: number;
  unencryptedAssets: number;
  weakAlgorithms: number;
  expiredKeys: number;
  invalidConfigurations: number;
  coveragePercent: number;
  recommendations: EncryptionAuditRecommendation[];
  sources: SourceAuditResult[];
  checks: EncryptionCheckResult[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
  triggeredBy: string | null;
  nextAuditAt: string | null;
}

export interface EncryptionAuditStatusSnapshot {
  enabled: boolean;
  status: EncryptionAuditStatus;
  overallScore: number;
  coveragePercent: number;
  weakAlgorithms: number;
  failedChecks: number;
  recommendations: number;
  lastAuditAt: string | null;
  nextAuditAt: string | null;
  evaluatedAt: string;
}

export interface EncryptionAuditHistoryEntry {
  runId: string;
  status: EncryptionAuditStatus;
  overallScore: number;
  coveragePercent: number;
  failedChecks: number;
  completedAt: string;
  triggeredBy: string | null;
}

export interface EncryptionAuditDashboardMetrics {
  overallScore: number;
  coverage: number;
  weakAlgorithms: number;
  failedChecks: number;
  recommendations: number;
  lastAuditAt: string | null;
}
