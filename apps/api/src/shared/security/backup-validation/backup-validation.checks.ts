/**
 * Individual backup validation checks — metadata only, no restore.
 */

import { getBackupValidationConfig } from "./backup-validation.config.js";
import type { CategoryEvidence } from "./backup-validation.collector.js";
import type {
  BackupCheckResult,
  BackupHealthStatus,
  BackupMetadataItem,
  BackupTargetCategory,
  BackupValidationType,
} from "./backup-validation.types.js";

const SHA256_HEX = /^[a-f0-9]{64}$/i;

function ageHours(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, (Date.now() - t) / 3_600_000);
}

export function runChecksForCategory(input: {
  category: BackupTargetCategory;
  records: BackupMetadataItem[];
  evidence: CategoryEvidence;
  validationType: BackupValidationType;
  encryptionConfigured: boolean;
}): {
  checks: BackupCheckResult[];
  health: BackupHealthStatus;
  expired: number;
  corrupted: number;
  successful: number;
  failed: number;
} {
  const cfg = getBackupValidationConfig();
  const { category, records, evidence, validationType, encryptionConfigured } =
    input;

  const categoryRecords =
    validationType === "INCREMENTAL"
      ? records
          .filter((r) => r.category === category)
          .slice(0, 5)
      : records.filter((r) => r.category === category);

  // For categories without dedicated BackupRecord rows, still validate presence evidence
  const checks: BackupCheckResult[] = [];
  let expired = 0;
  let corrupted = 0;
  let successful = 0;
  let failed = 0;

  // BACKUP_EXISTS
  const exists =
    categoryRecords.length > 0 ||
    (evidence.present &&
      (category === "FILE_STORAGE" ||
        category === "DOCUMENTS" ||
        category === "UPLOADS" ||
        category === "AI_CONFIG" ||
        category === "SECRETS"));

  if (categoryRecords.length > 0 || category === "DATABASE" || category === "APPLICATION") {
    checks.push({
      checkId: "BACKUP_EXISTS",
      status: categoryRecords.length > 0 ? "PASS" : "FAIL",
      message:
        categoryRecords.length > 0
          ? `${categoryRecords.length} backup record(s) for ${category}`
          : `No backup records found for ${category}`,
      evidence: { count: categoryRecords.length },
    });
  } else {
    checks.push({
      checkId: "BACKUP_EXISTS",
      status: exists ? "PASS" : "WARN",
      message: exists
        ? evidence.detail
        : `No backup coverage evidence for ${category}`,
      evidence: { present: evidence.present, count: evidence.count },
    });
  }

  // Checksums
  if (categoryRecords.length === 0) {
    checks.push({
      checkId: "BACKUP_CHECKSUM",
      status: "SKIP",
      message: "No backup records to checksum-validate",
    });
  } else {
    const withValid = categoryRecords.filter(
      (r) => r.checksum && SHA256_HEX.test(r.checksum),
    );
    const withAny = categoryRecords.filter((r) => Boolean(r.checksum));
    const status =
      withValid.length === categoryRecords.length
        ? "PASS"
        : withAny.length > 0
          ? "WARN"
          : "FAIL";
    checks.push({
      checkId: "BACKUP_CHECKSUM",
      status,
      message: `${withValid.length}/${categoryRecords.length} records have valid SHA-256 checksums`,
      evidence: { valid: withValid.length, total: categoryRecords.length },
    });
  }

  // Encryption (config present + completed records considered encrypted metadata path)
  if (!encryptionConfigured) {
    checks.push({
      checkId: "BACKUP_ENCRYPTION",
      status: "FAIL",
      message: "Enterprise encryption keys are not configured",
    });
  } else if (categoryRecords.length === 0) {
    checks.push({
      checkId: "BACKUP_ENCRYPTION",
      status: category === "SECRETS" && evidence.present ? "PASS" : "WARN",
      message:
        category === "SECRETS" && evidence.present
          ? "Secrets store uses enterprise encryption (values not exposed)"
          : "Encryption configured; no category backup records to verify",
    });
  } else {
    const completed = categoryRecords.filter((r) => r.status === "COMPLETED");
    checks.push({
      checkId: "BACKUP_ENCRYPTION",
      status: completed.length > 0 ? "PASS" : "WARN",
      message:
        completed.length > 0
          ? "Encryption service available; completed backups use checksummed metadata"
          : "Encryption configured but no completed backups in category",
    });
  }

  // Age / expired
  if (categoryRecords.length === 0) {
    checks.push({
      checkId: "BACKUP_AGE",
      status: "SKIP",
      message: "No backup records to age-check",
    });
    checks.push({
      checkId: "EXPIRED_BACKUPS",
      status: "SKIP",
      message: "No backup records to expiry-check",
    });
  } else {
    const ages = categoryRecords.map((r) =>
      ageHours(r.completedAt ?? r.createdAt),
    );
    const newest = Math.min(
      ...ages.filter((a): a is number => a != null),
    );
    const warningThreshold = cfg.maxAgeHours * cfg.warningAgeRatio;
    let ageStatus: BackupCheckResult["status"] = "PASS";
    if (!Number.isFinite(newest)) ageStatus = "WARN";
    else if (newest > cfg.maxAgeHours) ageStatus = "FAIL";
    else if (newest > warningThreshold) ageStatus = "WARN";

    checks.push({
      checkId: "BACKUP_AGE",
      status: ageStatus,
      message: Number.isFinite(newest)
        ? `Newest backup age ${Math.round(newest)}h (max ${cfg.maxAgeHours}h)`
        : "Unable to determine backup age",
      evidence: {
        newestAgeHours: Number.isFinite(newest) ? Math.round(newest) : null,
        maxAgeHours: cfg.maxAgeHours,
      },
    });

    for (const r of categoryRecords) {
      const age = ageHours(r.completedAt ?? r.createdAt);
      if (age != null && age > cfg.maxAgeHours) expired += 1;
    }
    checks.push({
      checkId: "EXPIRED_BACKUPS",
      status: expired === 0 ? "PASS" : expired < categoryRecords.length ? "WARN" : "FAIL",
      message:
        expired === 0
          ? "No expired backups"
          : `${expired} backup(s) exceeded max age`,
      evidence: { expired, maxAgeHours: cfg.maxAgeHours },
    });
  }

  // Integrity
  if (categoryRecords.length === 0) {
    checks.push({
      checkId: "BACKUP_INTEGRITY",
      status: "SKIP",
      message: "No backup records to integrity-check",
    });
  } else {
    const intact = categoryRecords.filter(
      (r) =>
        r.status === "COMPLETED" &&
        r.checksum &&
        SHA256_HEX.test(r.checksum) &&
        r.storageKey,
    );
    successful += intact.length;
    failed += categoryRecords.filter((r) => r.status === "FAILED").length;
    checks.push({
      checkId: "BACKUP_INTEGRITY",
      status:
        intact.length === categoryRecords.length
          ? "PASS"
          : intact.length > 0
            ? "WARN"
            : "FAIL",
      message: `${intact.length}/${categoryRecords.length} records pass integrity (completed + checksum + storage key)`,
    });
  }

  // Restore metadata (prepare-only — never executes restore)
  if (categoryRecords.length === 0) {
    checks.push({
      checkId: "RESTORE_METADATA",
      status: "SKIP",
      message: "No restore metadata to validate",
    });
  } else {
    const withMeta = categoryRecords.filter(
      (r) => r.storageKey && r.checksum && r.sizeBytes,
    );
    checks.push({
      checkId: "RESTORE_METADATA",
      status:
        withMeta.length === categoryRecords.length
          ? "PASS"
          : withMeta.length > 0
            ? "WARN"
            : "FAIL",
      message: `${withMeta.length}/${categoryRecords.length} records have restore-ready metadata (no restore executed)`,
    });
  }

  // Missing files
  if (categoryRecords.length === 0) {
    checks.push({
      checkId: "MISSING_FILES",
      status: evidence.present ? "PASS" : "WARN",
      message: evidence.detail,
    });
  } else {
    const missing = categoryRecords.filter(
      (r) => r.status === "COMPLETED" && !r.storageKey,
    );
    checks.push({
      checkId: "MISSING_FILES",
      status: missing.length === 0 ? "PASS" : "FAIL",
      message:
        missing.length === 0
          ? "No completed backups missing storage keys"
          : `${missing.length} completed backup(s) missing storage key`,
      evidence: { missing: missing.length },
    });
  }

  // Snapshot consistency
  if (categoryRecords.length === 0) {
    checks.push({
      checkId: "SNAPSHOT_CONSISTENCY",
      status: evidence.present ? "PASS" : "WARN",
      message: "Category evidence used as consistency proxy",
    });
  } else {
    const inconsistent = categoryRecords.filter((r) => {
      if (r.status !== "COMPLETED") return false;
      if (!r.checksum || !SHA256_HEX.test(r.checksum)) return true;
      if (!r.storageKey) return true;
      if (r.completedAt && r.startedAt) {
        return Date.parse(r.completedAt) < Date.parse(r.startedAt);
      }
      return false;
    });
    checks.push({
      checkId: "SNAPSHOT_CONSISTENCY",
      status: inconsistent.length === 0 ? "PASS" : "FAIL",
      message:
        inconsistent.length === 0
          ? "Snapshot metadata is consistent"
          : `${inconsistent.length} inconsistent snapshot(s)`,
    });
  }

  // Retention policy
  const retentionMs = cfg.retentionDays * 24 * 3_600_000;
  if (categoryRecords.length === 0) {
    checks.push({
      checkId: "RETENTION_POLICY",
      status: "PASS",
      message: `Retention policy ${cfg.retentionDays}d — no records to evaluate`,
      evidence: { retentionDays: cfg.retentionDays },
    });
  } else {
    const beyondRetention = categoryRecords.filter((r) => {
      const t = Date.parse(r.createdAt);
      return Number.isFinite(t) && Date.now() - t > retentionMs;
    });
    checks.push({
      checkId: "RETENTION_POLICY",
      status: beyondRetention.length === 0 ? "PASS" : "WARN",
      message:
        beyondRetention.length === 0
          ? `All records within ${cfg.retentionDays}d retention window`
          : `${beyondRetention.length} record(s) beyond retention window`,
      evidence: {
        retentionDays: cfg.retentionDays,
        beyondRetention: beyondRetention.length,
      },
    });
  }

  // Corrupted
  if (categoryRecords.length === 0) {
    checks.push({
      checkId: "CORRUPTED_BACKUPS",
      status: "SKIP",
      message: "No backup records to corruption-check",
    });
  } else {
    for (const r of categoryRecords) {
      const badChecksum = r.checksum != null && !SHA256_HEX.test(r.checksum);
      if (r.status === "FAILED" || badChecksum) corrupted += 1;
    }
    checks.push({
      checkId: "CORRUPTED_BACKUPS",
      status: corrupted === 0 ? "PASS" : "FAIL",
      message:
        corrupted === 0
          ? "No corrupted backups detected"
          : `${corrupted} corrupted or failed backup(s)`,
      evidence: { corrupted },
    });
  }

  // Incremental skips some deep checks already handled by slice; FULL runs all above.

  const failedChecks = checks.filter((c) => c.status === "FAIL").length;
  const warnChecks = checks.filter((c) => c.status === "WARN").length;
  let health: BackupHealthStatus = "HEALTHY";
  if (failedChecks > 0) health = "FAILED";
  else if (warnChecks > 0) health = "WARNING";
  else if (checks.every((c) => c.status === "SKIP")) health = "UNKNOWN";

  return {
    checks,
    health,
    expired,
    corrupted,
    successful:
      successful ||
      categoryRecords.filter((r) => r.status === "COMPLETED").length,
    failed:
      failed || categoryRecords.filter((r) => r.status === "FAILED").length,
  };
}

export function aggregateHealth(
  categoryHealth: BackupHealthStatus[],
): BackupHealthStatus {
  if (categoryHealth.length === 0) return "UNKNOWN";
  if (categoryHealth.includes("FAILED")) return "FAILED";
  if (categoryHealth.includes("WARNING")) return "WARNING";
  if (categoryHealth.every((h) => h === "UNKNOWN")) return "UNKNOWN";
  return "HEALTHY";
}
