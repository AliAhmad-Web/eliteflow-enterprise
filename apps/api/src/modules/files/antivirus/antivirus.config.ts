import type {
  AntivirusProviderId,
  AntivirusRuntimeConfig,
} from "./antivirus.types.js";

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === "") return defaultValue;
  switch (value.trim().toLowerCase()) {
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

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function parseProvider(raw: string | undefined, enabled: boolean): AntivirusProviderId {
  const normalized = raw?.trim().toLowerCase();
  if (normalized === "clamav" || normalized === "cloud" || normalized === "noop") {
    return normalized;
  }
  // Production-safe: when AV is on, default to ClamAV (not silent noop).
  if (enabled) return "clamav";
  return "noop";
}

/**
 * Antivirus configuration.
 *
 * Env:
 * - VIRUS_SCAN_ENABLED — default true in production, false otherwise
 * - VIRUS_SCAN_PROVIDER | VIRUS_SCAN_ENGINE — noop | clamav | cloud
 * - VIRUS_SCAN_TIMEOUT_MS — default 15000
 * - VIRUS_SCAN_FAIL_CLOSED — default true
 * - CLAMAV_HOST / CLAMAV_PORT — default 127.0.0.1:3310
 * - VIRUS_SCAN_CLOUD_URL / VIRUS_SCAN_CLOUD_API_KEY — cloud adapter
 */
export function getAntivirusConfig(): AntivirusRuntimeConfig {
  const enabled = parseBool(
    process.env.VIRUS_SCAN_ENABLED,
    isProduction(),
  );

  const provider = parseProvider(
    process.env.VIRUS_SCAN_PROVIDER ?? process.env.VIRUS_SCAN_ENGINE,
    enabled,
  );

  return {
    enabled,
    provider,
    timeoutMs: parsePositiveInt(process.env.VIRUS_SCAN_TIMEOUT_MS, 15_000),
    failClosed: parseBool(process.env.VIRUS_SCAN_FAIL_CLOSED, true),
    clamavHost: process.env.CLAMAV_HOST?.trim() || "127.0.0.1",
    clamavPort: parsePositiveInt(process.env.CLAMAV_PORT, 3310),
    cloudUrl: process.env.VIRUS_SCAN_CLOUD_URL?.trim() || null,
    cloudApiKey: process.env.VIRUS_SCAN_CLOUD_API_KEY?.trim() || null,
  };
}
