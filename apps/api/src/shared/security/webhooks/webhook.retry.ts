/**
 * Webhook retry engine — exponential backoff + dead letter classification.
 */

import { getWebhookSecurityConfig } from "./webhook.config.js";
import type {
  WebhookDeliveryRecord,
  WebhookFailureClass,
} from "./webhook.types.js";

export function classifyFailure(input: {
  httpStatus?: number | null;
  error?: string | null;
}): WebhookFailureClass {
  const status = input.httpStatus ?? null;
  if (status != null) {
    if (status >= 500) return "HTTP_5XX";
    if (status >= 400) return "HTTP_4XX";
  }
  const err = (input.error ?? "").toLowerCase();
  if (err.includes("timeout") || err.includes("aborted")) return "TIMEOUT";
  if (
    err.includes("econn") ||
    err.includes("network") ||
    err.includes("fetch failed")
  ) {
    return "NETWORK";
  }
  if (err.includes("signature")) return "SIGNATURE";
  if (err.includes("replay") || err.includes("nonce")) return "REPLAY";
  if (err.includes("secret") || err.includes("config")) return "CONFIGURATION";
  return "UNKNOWN";
}

export function computeBackoffMs(attempt: number): number {
  const cfg = getWebhookSecurityConfig();
  const exp = Math.min(
    cfg.maxBackoffMs,
    cfg.baseBackoffMs * 2 ** Math.max(0, attempt - 1),
  );
  // Full jitter
  return Math.floor(Math.random() * exp) + cfg.baseBackoffMs;
}

export function shouldRetry(
  record: WebhookDeliveryRecord,
  failureClass: WebhookFailureClass,
): boolean {
  if (record.attempt >= record.maxAttempts) return false;
  // Do not retry clear client auth/signature style 4xx except 408/429
  if (failureClass === "HTTP_4XX") {
    const status = record.httpStatus;
    if (status === 408 || status === 429) return true;
    return false;
  }
  if (failureClass === "SIGNATURE" || failureClass === "REPLAY") return false;
  if (failureClass === "CONFIGURATION") return false;
  return true;
}

export function nextRetryIso(attempt: number): string {
  return new Date(Date.now() + computeBackoffMs(attempt)).toISOString();
}
