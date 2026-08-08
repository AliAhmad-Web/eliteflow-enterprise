/**
 * SIEM Integration — env-driven configuration (no Prisma).
 */

import {
  SIEM_AUTH_MODES,
  SIEM_PROVIDERS,
  SIEM_TRANSPORTS,
  type SiemAuthMode,
  type SiemProvider,
  type SiemRuntimeProviderConfig,
  type SiemTransport,
} from "./siem.types.js";

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

function parseProviderList(raw: string | undefined): SiemProvider[] {
  if (!raw || raw.trim().length === 0) {
    return ["GENERIC_WEBHOOK"];
  }
  const allowed = new Set<string>(SIEM_PROVIDERS);
  return raw
    .split(",")
    .map((p) => p.trim().toUpperCase())
    .filter((p): p is SiemProvider => allowed.has(p));
}

function parseTransport(
  raw: string | undefined,
  fallback: SiemTransport,
): SiemTransport {
  if (!raw) return fallback;
  const upper = raw.trim().toUpperCase() as SiemTransport;
  return (SIEM_TRANSPORTS as readonly string[]).includes(upper)
    ? upper
    : fallback;
}

function parseAuthMode(raw: string | undefined): SiemAuthMode {
  if (!raw) return "NONE";
  const upper = raw.trim().toUpperCase() as SiemAuthMode;
  return (SIEM_AUTH_MODES as readonly string[]).includes(upper)
    ? upper
    : "NONE";
}

function providerEnvPrefix(provider: SiemProvider): string {
  return `SIEM_${provider}`;
}

function readProviderConfig(provider: SiemProvider): SiemRuntimeProviderConfig {
  const prefix = providerEnvPrefix(provider);
  const endpoint =
    process.env[`${prefix}_ENDPOINT`]?.trim() ||
    process.env[`${prefix}_URL`]?.trim() ||
    null;
  const apiKey =
    process.env[`${prefix}_API_KEY`]?.trim() ||
    process.env[`${prefix}_HEC_TOKEN`]?.trim() ||
    null;
  const bearerToken = process.env[`${prefix}_BEARER_TOKEN`]?.trim() || null;
  const webhookSigningSecret =
    process.env[`${prefix}_SIGNING_SECRET`]?.trim() ||
    process.env.SIEM_WEBHOOK_SIGNING_SECRET?.trim() ||
    null;
  const syslogTarget = process.env[`${prefix}_SYSLOG_TARGET`]?.trim() || null;

  const defaultTransport: SiemTransport =
    provider === "SPLUNK"
      ? "REST_API"
      : provider === "QRADAR"
        ? "SYSLOG_RFC5424"
        : "HTTPS_WEBHOOK";

  const enabledExplicit = process.env[`${prefix}_ENABLED`];
  const enabled =
    enabledExplicit !== undefined
      ? parseEnvFlag(enabledExplicit, false)
      : Boolean(endpoint || syslogTarget);

  return {
    provider,
    enabled,
    transport: parseTransport(
      process.env[`${prefix}_TRANSPORT`],
      defaultTransport,
    ),
    endpoint,
    authMode: parseAuthMode(process.env[`${prefix}_AUTH_MODE`]),
    apiKey,
    bearerToken,
    webhookSigningSecret,
    syslogTarget,
  };
}

export interface SiemConfig {
  enabled: boolean;
  tenantId: string | null;
  batchSize: number;
  maxQueueSize: number;
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  flushIntervalMs: number;
  /** Outbound HTTP/HTTPS request timeout (ms). */
  requestTimeoutMs: number;
  circuitFailureThreshold: number;
  circuitOpenMs: number;
  providers: SiemRuntimeProviderConfig[];
}

let cached: SiemConfig | null = null;

export function getSiemConfig(forceRefresh = false): SiemConfig {
  if (cached && !forceRefresh) return cached;

  const enabled = parseEnvFlag(
    process.env.SECURITY_SIEM_ENABLED ?? process.env.SIEM_ENABLED,
    false,
  );

  const selected = parseProviderList(
    process.env.SIEM_PROVIDERS ?? process.env.SECURITY_SIEM_PROVIDERS,
  );

  const providers = SIEM_PROVIDERS.map((p) => {
    const cfg = readProviderConfig(p);
    if (!selected.includes(p)) {
      return { ...cfg, enabled: false };
    }
    return cfg;
  });

  cached = {
    enabled,
    tenantId:
      process.env.SIEM_TENANT_ID?.trim() ||
      process.env.TENANT_ID?.trim() ||
      null,
    batchSize: parseIntEnv(process.env.SIEM_BATCH_SIZE, 25),
    maxQueueSize: parseIntEnv(process.env.SIEM_MAX_QUEUE_SIZE, 2000),
    maxRetries: parseIntEnv(process.env.SIEM_MAX_RETRIES, 5),
    baseBackoffMs: parseIntEnv(process.env.SIEM_BASE_BACKOFF_MS, 1000),
    maxBackoffMs: parseIntEnv(process.env.SIEM_MAX_BACKOFF_MS, 60_000),
    flushIntervalMs: parseIntEnv(process.env.SIEM_FLUSH_INTERVAL_MS, 5000),
    requestTimeoutMs: parseIntEnv(
      process.env.SIEM_REQUEST_TIMEOUT_MS ??
        process.env.SECURITY_SIEM_REQUEST_TIMEOUT_MS,
      10_000,
    ),
    circuitFailureThreshold: parseIntEnv(
      process.env.SIEM_CIRCUIT_FAILURE_THRESHOLD,
      5,
    ),
    circuitOpenMs: parseIntEnv(process.env.SIEM_CIRCUIT_OPEN_MS, 30_000),
    providers,
  };

  return cached;
}

export function resetSiemConfigCache(): void {
  cached = null;
}

export function isSiemEnabled(): boolean {
  return getSiemConfig().enabled;
}

export function getEnabledSiemProviders(): SiemRuntimeProviderConfig[] {
  return getSiemConfig().providers.filter((p) => p.enabled);
}
