/**
 * Enterprise Signed Webhook Security — constants.
 */

export const WEBHOOK_HEADERS = {
  SIGNATURE: "X-EliteFlow-Signature",
  TIMESTAMP: "X-EliteFlow-Timestamp",
  NONCE: "X-EliteFlow-Nonce",
  DELIVERY: "X-EliteFlow-Delivery",
  KEY_ID: "X-EliteFlow-Key-Id",
  EVENT_ID: "X-EliteFlow-Event-Id",
} as const;

export const WEBHOOK_STORE_PREFIX = "ebm:webhook";
export const WEBHOOK_NONCE_PREFIX = "ebm:webhook-nonce";
export const WEBHOOK_SECRET_PREFIX = "ebm:webhook-secret";

export const WEBHOOK_EVENTS = {
  WEBHOOK_CREATED: "WEBHOOK_CREATED",
  WEBHOOK_SIGNED: "WEBHOOK_SIGNED",
  WEBHOOK_DELIVERED: "WEBHOOK_DELIVERED",
  WEBHOOK_FAILED: "WEBHOOK_FAILED",
  WEBHOOK_RETRY: "WEBHOOK_RETRY",
  WEBHOOK_SIGNATURE_INVALID: "WEBHOOK_SIGNATURE_INVALID",
  WEBHOOK_REPLAY_ATTACK: "WEBHOOK_REPLAY_ATTACK",
  WEBHOOK_SECRET_ROTATED: "WEBHOOK_SECRET_ROTATED",
  WEBHOOK_DEAD_LETTER: "WEBHOOK_DEAD_LETTER",
} as const;

export const WEBHOOK_AUDIT_ACTIONS = {
  STATUS: "webhook.security.status_viewed",
  DELIVERIES: "webhook.security.deliveries_viewed",
  RETRIES: "webhook.security.retries_viewed",
  ROTATE: "webhook.security.secret_rotated",
  RETRY: "webhook.security.retry_requested",
} as const;
