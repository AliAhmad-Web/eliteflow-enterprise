/**
 * Disaster Recovery Test — env-driven configuration (simulation targets only).
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

export interface DrTestConfig {
  enabled: boolean;
  scheduleIntervalMs: number;
  historyLimit: number;
  /** Simulated RTO ceiling for probe validation (ms). */
  defaultRtoMs: number;
  /** Simulated RPO ceiling (ms) — metadata freshness proxy. */
  defaultRpoMs: number;
  criticalRtoMs: number;
  probeTimeoutMs: number;
}

let cached: DrTestConfig | null = null;

export function getDrTestConfig(forceRefresh = false): DrTestConfig {
  if (cached && !forceRefresh) return cached;

  cached = {
    enabled: parseEnvFlag(
      process.env.SECURITY_DISASTER_RECOVERY_TEST_ENABLED ??
        process.env.DISASTER_RECOVERY_TEST_ENABLED,
      true,
    ),
    scheduleIntervalMs: parseIntEnv(
      process.env.DR_TEST_INTERVAL_MS,
      12 * 60 * 60 * 1000,
    ),
    historyLimit: parseIntEnv(process.env.DR_TEST_HISTORY_LIMIT, 50),
    defaultRtoMs: parseIntEnv(process.env.DR_TEST_DEFAULT_RTO_MS, 30_000),
    defaultRpoMs: parseIntEnv(process.env.DR_TEST_DEFAULT_RPO_MS, 300_000),
    criticalRtoMs: parseIntEnv(process.env.DR_TEST_CRITICAL_RTO_MS, 5_000),
    probeTimeoutMs: parseIntEnv(process.env.DR_TEST_PROBE_TIMEOUT_MS, 10_000),
  };

  return cached;
}

export function resetDrTestConfigCache(): void {
  cached = null;
}

export function isDrTestEnabled(): boolean {
  return getDrTestConfig().enabled;
}
