/**
 * Webhook Security configuration.
 *
 * Env:
 * - WEBHOOK_SECURITY_ENABLED / SECURITY_WEBHOOK_SECURITY (default OFF)
 * - WEBHOOK_SIGNING_SECRET (primary)
 * - WEBHOOK_SIGNING_SECRET_PREVIOUS (rotation window)
 * - WEBHOOK_SIGNING_KEY_ID (default "whsec_primary")
 * - WEBHOOK_SIGNING_KEY_ID_PREVIOUS
 * - WEBHOOK_SIGNING_ALG (HMAC_SHA256 | HMAC_SHA512)
 * - WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS (default 300)
 * - WEBHOOK_MAX_RETRIES (default 5)
 */

import type {
  WebhookAlgorithm,
  WebhookSecurityConfig,
} from "./webhook.types.js";

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

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function parseAlgorithm(raw: string | undefined): WebhookAlgorithm {
  const normalized = (raw ?? "HMAC_SHA256").trim().toUpperCase();
  if (normalized === "HMAC_SHA512" || normalized === "SHA512") {
    return "HMAC_SHA512";
  }
  return "HMAC_SHA256";
}

let cached: WebhookSecurityConfig | null = null;

export function getWebhookSecurityConfig(
  forceRefresh = false,
): WebhookSecurityConfig {
  if (cached && !forceRefresh) return cached;
  cached = {
    enabled: parseEnvFlag(
      process.env.WEBHOOK_SECURITY_ENABLED ??
        process.env.SECURITY_WEBHOOK_SECURITY,
      false,
    ),
    algorithm: parseAlgorithm(process.env.WEBHOOK_SIGNING_ALG),
    timestampToleranceSeconds: parsePositiveInt(
      process.env.WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
      300,
    ),
    maxRetries: parsePositiveInt(process.env.WEBHOOK_MAX_RETRIES, 5),
    baseBackoffMs: parsePositiveInt(process.env.WEBHOOK_BASE_BACKOFF_MS, 1000),
    maxBackoffMs: parsePositiveInt(
      process.env.WEBHOOK_MAX_BACKOFF_MS,
      5 * 60 * 1000,
    ),
    deliveryTtlMs: parsePositiveInt(
      process.env.WEBHOOK_DELIVERY_TTL_MS,
      24 * 60 * 60 * 1000,
    ),
    historyLimit: parsePositiveInt(process.env.WEBHOOK_HISTORY_LIMIT, 200),
    primarySecret: process.env.WEBHOOK_SIGNING_SECRET?.trim() || null,
    previousSecret:
      process.env.WEBHOOK_SIGNING_SECRET_PREVIOUS?.trim() || null,
    keyId: process.env.WEBHOOK_SIGNING_KEY_ID?.trim() || "whsec_primary",
    previousKeyId:
      process.env.WEBHOOK_SIGNING_KEY_ID_PREVIOUS?.trim() || null,
    rotationWindowMs: parsePositiveInt(
      process.env.WEBHOOK_ROTATION_WINDOW_MS,
      24 * 60 * 60 * 1000,
    ),
  };
  return cached;
}

export function resetWebhookSecurityConfigCache(): void {
  cached = null;
}

export function isWebhookSecurityEnabled(): boolean {
  return getWebhookSecurityConfig().enabled;
}
