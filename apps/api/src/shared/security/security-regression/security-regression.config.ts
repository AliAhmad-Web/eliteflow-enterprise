/**
 * Security Regression Testing — env configuration (assessment only).
 *
 * Env:
 * - SECURITY_REGRESSION_ENABLED / REGRESSION_TEST_ENABLED (default ON)
 * - SECURITY_REGRESSION_INTERVAL_MS
 * - SECURITY_REGRESSION_HISTORY_LIMIT
 * - SECURITY_REGRESSION_READINESS_THRESHOLD (default 70)
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

export interface SecurityRegressionConfig {
  enabled: boolean;
  scheduleIntervalMs: number;
  historyLimit: number;
  readinessThreshold: number;
}

let cached: SecurityRegressionConfig | null = null;

export function getSecurityRegressionConfig(
  forceRefresh = false,
): SecurityRegressionConfig {
  if (cached && !forceRefresh) return cached;
  cached = {
    enabled: parseEnvFlag(
      process.env.SECURITY_REGRESSION_ENABLED ??
        process.env.REGRESSION_TEST_ENABLED,
      true,
    ),
    scheduleIntervalMs: parseIntEnv(
      process.env.SECURITY_REGRESSION_INTERVAL_MS,
      24 * 60 * 60 * 1000,
    ),
    historyLimit: parseIntEnv(process.env.SECURITY_REGRESSION_HISTORY_LIMIT, 50),
    readinessThreshold: parseIntEnv(
      process.env.SECURITY_REGRESSION_READINESS_THRESHOLD,
      70,
    ),
  };
  return cached;
}

export function resetSecurityRegressionConfigCache(): void {
  cached = null;
}

export function isSecurityRegressionEnabled(): boolean {
  return getSecurityRegressionConfig().enabled;
}
