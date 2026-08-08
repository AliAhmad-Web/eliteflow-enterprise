/**
 * Tenant Isolation Testing — env configuration (assessment only).
 *
 * Env:
 * - SECURITY_TENANT_ISOLATION_ENABLED / TENANT_ISOLATION_ENABLED (default ON)
 * - TENANT_ISOLATION_INTERVAL_MS
 * - TENANT_ISOLATION_HISTORY_LIMIT
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

export interface TenantIsolationConfig {
  enabled: boolean;
  scheduleIntervalMs: number;
  historyLimit: number;
}

let cached: TenantIsolationConfig | null = null;

export function getTenantIsolationConfig(
  forceRefresh = false,
): TenantIsolationConfig {
  if (cached && !forceRefresh) return cached;
  cached = {
    enabled: parseEnvFlag(
      process.env.SECURITY_TENANT_ISOLATION_ENABLED ??
        process.env.TENANT_ISOLATION_ENABLED,
      true,
    ),
    scheduleIntervalMs: parseIntEnv(
      process.env.TENANT_ISOLATION_INTERVAL_MS,
      24 * 60 * 60 * 1000,
    ),
    historyLimit: parseIntEnv(process.env.TENANT_ISOLATION_HISTORY_LIMIT, 50),
  };
  return cached;
}

export function resetTenantIsolationConfigCache(): void {
  cached = null;
}

export function isTenantIsolationEnabled(): boolean {
  return getTenantIsolationConfig().enabled;
}
