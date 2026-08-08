/**
 * Enterprise Signed Webhook Security — types.
 */

export const WEBHOOK_ALGORITHMS = ["HMAC_SHA256", "HMAC_SHA512"] as const;
export type WebhookAlgorithm = (typeof WEBHOOK_ALGORITHMS)[number];

export const WEBHOOK_DELIVERY_STATUSES = [
  "QUEUED",
  "SENDING",
  "DELIVERED",
  "FAILED",
  "RETRYING",
  "EXPIRED",
  "DEAD_LETTER",
] as const;
export type WebhookDeliveryStatus =
  (typeof WEBHOOK_DELIVERY_STATUSES)[number];

export const WEBHOOK_FAILURE_CLASSES = [
  "NETWORK",
  "TIMEOUT",
  "HTTP_4XX",
  "HTTP_5XX",
  "SIGNATURE",
  "REPLAY",
  "CONFIGURATION",
  "UNKNOWN",
] as const;
export type WebhookFailureClass =
  (typeof WEBHOOK_FAILURE_CLASSES)[number];

export interface WebhookSecurityConfig {
  enabled: boolean;
  algorithm: WebhookAlgorithm;
  timestampToleranceSeconds: number;
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  deliveryTtlMs: number;
  historyLimit: number;
  /** Env-backed signing secret (never logged). */
  primarySecret: string | null;
  previousSecret: string | null;
  keyId: string;
  previousKeyId: string | null;
  rotationWindowMs: number;
}

export interface WebhookSecretRecord {
  keyId: string;
  /** Encrypted ciphertext — never expose plaintext. */
  encryptedSecret: string;
  version: number;
  createdAt: number;
  rotatedAt: number | null;
  active: boolean;
}

export interface WebhookSignResult {
  signature: string;
  timestamp: string;
  nonce: string;
  deliveryId: string;
  keyId: string;
  payloadHash: string;
  algorithm: WebhookAlgorithm;
  /** Canonical signing string (no secret). */
  signingString: string;
}

export interface WebhookSecurityHeaders {
  "X-EliteFlow-Signature": string;
  "X-EliteFlow-Timestamp": string;
  "X-EliteFlow-Nonce": string;
  "X-EliteFlow-Delivery": string;
  "X-EliteFlow-Key-Id": string;
}

export interface DispatchWebhookInput {
  url: string;
  eventId: string;
  eventType: string;
  payload: unknown;
  headers?: Record<string, string>;
  /** Optional idempotency / correlation. */
  correlationId?: string | null;
}

export interface WebhookDeliveryRecord {
  deliveryId: string;
  eventId: string;
  eventType: string;
  /** Destination URL retained for retries (not a secret). */
  url: string;
  urlHost: string;
  status: WebhookDeliveryStatus;
  attempt: number;
  maxAttempts: number;
  failureClass: WebhookFailureClass | null;
  lastError: string | null;
  httpStatus: number | null;
  keyId: string;
  /** Masked key id for APIs. */
  keyIdMasked: string;
  createdAt: string;
  updatedAt: string;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  /** Sanitized payload metadata only — never raw payload/secrets. */
  metadata: {
    payloadBytes: number;
    eventType: string;
    correlationId: string | null;
  };
}

export interface WebhookVerifyInput {
  body: string;
  signature: string;
  timestamp: string;
  nonce: string;
  eventId: string;
  keyId?: string | null;
  deliveryId?: string | null;
}

export interface WebhookVerifyResult {
  valid: boolean;
  reason?: string;
  replay?: boolean;
}

export interface WebhookSecurityStatusSnapshot {
  enabled: boolean;
  algorithm: WebhookAlgorithm;
  keyIdMasked: string;
  hasPreviousSecret: boolean;
  timestampToleranceSeconds: number;
  maxRetries: number;
  deliveries: number;
  failures: number;
  retries: number;
  replayAttacks: number;
  signatureFailures: number;
  deadLetters: number;
  evaluatedAt: string;
}

export interface WebhookSecurityDashboardMetrics {
  deliveries: number;
  failures: number;
  retries: number;
  replayAttacks: number;
  signatureFailures: number;
  deadLetters: number;
}
