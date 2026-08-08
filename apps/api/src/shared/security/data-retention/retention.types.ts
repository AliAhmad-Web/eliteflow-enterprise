import type { RetentionEntityType, RetentionLifecycleStatus } from "@enterprise/database";

export const RETENTION_ENTITY_TYPES = [
  "AUDIT_LOGS",
  "AI_MEMORY",
  "AI_DOCUMENTS",
  "FILES",
  "COMMUNICATIONS",
  "PROJECTS",
  "TASKS",
  "HR_DOCUMENTS",
  "NOTIFICATIONS",
  "REPORTS",
] as const;

export type RetentionEntityTypeKey = (typeof RETENTION_ENTITY_TYPES)[number];

export const RETENTION_LIFECYCLE_STATUSES = [
  "ACTIVE",
  "ARCHIVED",
  "LEGAL_HOLD",
  "PENDING_DELETION",
  "SECURE_DELETED",
] as const;

export type RetentionLifecycleStatusKey =
  (typeof RETENTION_LIFECYCLE_STATUSES)[number];

export interface RetentionPolicyDefinition {
  entityType: RetentionEntityTypeKey;
  label: string;
  /** How long records are retained in primary storage (days). */
  retentionPeriodDays: number;
  /** Soft-archive eligibility age (days). Null = never auto-archive. */
  archiveAfterDays: number | null;
  /** Secure-delete eligibility age (days). Null = never auto-delete. */
  deleteAfterDays: number | null;
  /** Whether the processor may auto-cleanup this category. */
  autoCleanupEligible: boolean;
  /** Whether secure deletion is allowed at all (audit logs: false). */
  allowSecureDelete: boolean;
  /** Default legal-hold flag for policy reporting (runtime holds override). */
  legalHoldDefault: boolean;
}

export interface RetentionCandidate {
  entityType: RetentionEntityType;
  entityId: string;
  createdAt: Date;
}

export interface RetentionModuleRunResult {
  entityType: RetentionEntityTypeKey;
  archived: number;
  deleted: number;
  skippedLegalHold: number;
  errors: number;
  errorMessages: string[];
}

export interface RetentionRunReport {
  runId: string;
  itemsArchived: number;
  itemsDeleted: number;
  legalHolds: number;
  failures: number;
  executionTime: number;
  modules: RetentionModuleRunResult[];
  status: "COMPLETED" | "FAILED";
}

export interface RetentionPolicyDto {
  entityType: RetentionEntityTypeKey;
  label: string;
  retentionPeriodDays: number;
  archiveAfterDays: number | null;
  deleteAfterDays: number | null;
  autoCleanupEligible: boolean;
  allowSecureDelete: boolean;
  legalHold: boolean;
  lifecycleStates: RetentionLifecycleStatusKey[];
}

export type { RetentionEntityType, RetentionLifecycleStatus };
