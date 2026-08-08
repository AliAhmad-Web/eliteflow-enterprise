import type { RetentionPolicyDefinition } from "./retention.types.js";
import { RETENTION_LIFECYCLE_STATUSES } from "./retention.types.js";

/**
 * Centralized retention policy definitions (Phase 3 Step 9).
 * Tunable via code; evaluation always goes through DataRetentionService.
 */
export const RETENTION_POLICIES: readonly RetentionPolicyDefinition[] = [
  {
    entityType: "AUDIT_LOGS",
    label: "Audit Logs",
    retentionPeriodDays: 2555, // ~7 years
    archiveAfterDays: 365,
    deleteAfterDays: null,
    autoCleanupEligible: false,
    allowSecureDelete: false,
    legalHoldDefault: false,
  },
  {
    entityType: "AI_MEMORY",
    label: "AI Memory",
    retentionPeriodDays: 365,
    archiveAfterDays: 180,
    deleteAfterDays: 365,
    autoCleanupEligible: true,
    allowSecureDelete: true,
    legalHoldDefault: false,
  },
  {
    entityType: "AI_DOCUMENTS",
    label: "AI Documents",
    retentionPeriodDays: 730,
    archiveAfterDays: 365,
    deleteAfterDays: 730,
    autoCleanupEligible: true,
    allowSecureDelete: true,
    legalHoldDefault: false,
  },
  {
    entityType: "FILES",
    label: "Files",
    retentionPeriodDays: 1825, // ~5 years
    archiveAfterDays: 730,
    deleteAfterDays: 1825,
    autoCleanupEligible: true,
    allowSecureDelete: true,
    legalHoldDefault: false,
  },
  {
    entityType: "COMMUNICATIONS",
    label: "Communications",
    retentionPeriodDays: 1095, // ~3 years
    archiveAfterDays: 365,
    deleteAfterDays: 1095,
    autoCleanupEligible: true,
    allowSecureDelete: true,
    legalHoldDefault: false,
  },
  {
    entityType: "PROJECTS",
    label: "Projects",
    retentionPeriodDays: 2555,
    archiveAfterDays: 730,
    deleteAfterDays: 2555,
    autoCleanupEligible: true,
    allowSecureDelete: true,
    legalHoldDefault: false,
  },
  {
    entityType: "TASKS",
    label: "Tasks",
    retentionPeriodDays: 1095,
    archiveAfterDays: 365,
    deleteAfterDays: 1095,
    autoCleanupEligible: true,
    allowSecureDelete: true,
    legalHoldDefault: false,
  },
  {
    entityType: "HR_DOCUMENTS",
    label: "HR Documents",
    retentionPeriodDays: 2555,
    archiveAfterDays: 1095,
    deleteAfterDays: 2555,
    autoCleanupEligible: true,
    allowSecureDelete: true,
    legalHoldDefault: false,
  },
  {
    entityType: "NOTIFICATIONS",
    label: "Notifications",
    retentionPeriodDays: 365,
    archiveAfterDays: 90,
    deleteAfterDays: 365,
    autoCleanupEligible: true,
    allowSecureDelete: true,
    legalHoldDefault: false,
  },
  {
    entityType: "REPORTS",
    label: "Reports",
    retentionPeriodDays: 1095,
    archiveAfterDays: 365,
    deleteAfterDays: 1095,
    autoCleanupEligible: true,
    allowSecureDelete: true,
    legalHoldDefault: false,
  },
] as const;

export function getRetentionPolicy(
  entityType: RetentionPolicyDefinition["entityType"],
): RetentionPolicyDefinition {
  const policy = RETENTION_POLICIES.find((p) => p.entityType === entityType);
  if (!policy) {
    throw new Error(`Unknown retention entity type: ${entityType}`);
  }
  return policy;
}

export const RETENTION_BATCH_SIZE = 100;

export { RETENTION_LIFECYCLE_STATUSES };
