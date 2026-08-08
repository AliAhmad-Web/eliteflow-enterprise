/**
 * Backup Validation — env-driven configuration (no Prisma redesign).
 */

function parseEnvFlag(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return defaultValue;
  switch (normalized) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return defaultValue;
  }
}

function parseIntEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export interface BackupValidationConfig {
  enabled: boolean;
  /** Max age before a backup is considered stale/expired (hours). */
  maxAgeHours: number;
  /** Soft warning threshold as fraction of maxAgeHours (0–1). */
  warningAgeRatio: number;
  retentionDays: number;
  scheduleIntervalMs: number;
  historyLimit: number;
  /** Expected SHA-256 hex length */
  checksumHexLength: number;
}

let cached: BackupValidationConfig | null = null;

export function getBackupValidationConfig(
  forceRefresh = false,
): BackupValidationConfig {
  if (cached && !forceRefresh) return cached;

  cached = {
    enabled: parseEnvFlag(
      process.env.SECURITY_BACKUP_VALIDATION_ENABLED ??
        process.env.BACKUP_VALIDATION_ENABLED,
      true,
    ),
    maxAgeHours: parseIntEnv(
      process.env.BACKUP_VALIDATION_MAX_AGE_HOURS,
      168, // 7 days
    ),
    warningAgeRatio: Math.min(
      1,
      Math.max(
        0.1,
        Number.parseFloat(
          process.env.BACKUP_VALIDATION_WARNING_AGE_RATIO ?? "0.75",
        ) || 0.75,
      ),
    ),
    retentionDays: parseIntEnv(
      process.env.BACKUP_VALIDATION_RETENTION_DAYS,
      90,
    ),
    scheduleIntervalMs: parseIntEnv(
      process.env.BACKUP_VALIDATION_INTERVAL_MS,
      6 * 60 * 60 * 1000,
    ),
    historyLimit: parseIntEnv(process.env.BACKUP_VALIDATION_HISTORY_LIMIT, 50),
    checksumHexLength: 64,
  };

  return cached;
}

export function resetBackupValidationConfigCache(): void {
  cached = null;
}

export function isBackupValidationEnabled(): boolean {
  return getBackupValidationConfig().enabled;
}
