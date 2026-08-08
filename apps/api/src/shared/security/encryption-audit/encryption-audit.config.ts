/**
 * Encryption Audit — env-driven configuration (no Prisma redesign).
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

export interface EncryptionAuditConfig {
  enabled: boolean;
  scheduleIntervalMs: number;
  historyLimit: number;
  /** Soft max key age days when ENTERPRISE_ENCRYPTION_KEY_SET_AT is present */
  maxKeyAgeDays: number;
  sampleSize: number;
  expectedAlgorithm: string;
  expectedAesKeyBytes: number;
  minJwtSecretLength: number;
}

let cached: EncryptionAuditConfig | null = null;

export function getEncryptionAuditConfig(
  forceRefresh = false,
): EncryptionAuditConfig {
  if (cached && !forceRefresh) return cached;

  cached = {
    enabled: parseEnvFlag(
      process.env.SECURITY_ENCRYPTION_AUDIT_ENABLED ??
        process.env.ENCRYPTION_AUDIT_ENABLED,
      true,
    ),
    scheduleIntervalMs: parseIntEnv(
      process.env.ENCRYPTION_AUDIT_INTERVAL_MS,
      6 * 60 * 60 * 1000,
    ),
    historyLimit: parseIntEnv(process.env.ENCRYPTION_AUDIT_HISTORY_LIMIT, 50),
    maxKeyAgeDays: parseIntEnv(process.env.ENCRYPTION_AUDIT_MAX_KEY_AGE_DAYS, 365),
    sampleSize: parseIntEnv(process.env.ENCRYPTION_AUDIT_SAMPLE_SIZE, 50),
    expectedAlgorithm: "aes-256-gcm",
    expectedAesKeyBytes: 32,
    minJwtSecretLength: 32,
  };

  return cached;
}

export function resetEncryptionAuditConfigCache(): void {
  cached = null;
}

export function isEncryptionAuditEnabled(): boolean {
  return getEncryptionAuditConfig().enabled;
}
