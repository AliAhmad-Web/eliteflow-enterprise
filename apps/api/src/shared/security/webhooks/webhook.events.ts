/**
 * Webhook monitoring event emitters — sanitized metadata only.
 */

import { logger } from "../logger.js";
import { securityMonitoringService } from "../monitoring/index.js";
import { THREAT_DETECTION_TYPES } from "../monitoring/monitoring.types.js";
import { WEBHOOK_EVENTS } from "./webhook.constants.js";

function emitLog(event: string, metadata: Record<string, unknown>): void {
  logger.info(`[webhooks] ${event}`, metadata);
}

export function emitWebhookCreated(metadata: Record<string, unknown>): void {
  emitLog(WEBHOOK_EVENTS.WEBHOOK_CREATED, metadata);
  void securityMonitoringService.reportWebhookSecurityEvent({
    type: THREAT_DETECTION_TYPES.WEBHOOK_CREATED,
    resource: "webhook",
    message: "Webhook delivery created",
    metadata: { ...metadata, sanitized: true },
  });
}

export function emitWebhookSigned(metadata: Record<string, unknown>): void {
  emitLog(WEBHOOK_EVENTS.WEBHOOK_SIGNED, metadata);
  void securityMonitoringService.reportWebhookSecurityEvent({
    type: THREAT_DETECTION_TYPES.WEBHOOK_SIGNED,
    resource: "webhook",
    message: "Webhook payload signed",
    metadata: { ...metadata, sanitized: true },
  });
}

export function emitWebhookDelivered(metadata: Record<string, unknown>): void {
  emitLog(WEBHOOK_EVENTS.WEBHOOK_DELIVERED, metadata);
  void securityMonitoringService.reportWebhookSecurityEvent({
    type: THREAT_DETECTION_TYPES.WEBHOOK_DELIVERED,
    resource: "webhook",
    message: "Webhook delivered",
    metadata: { ...metadata, sanitized: true },
  });
}

export function emitWebhookFailed(metadata: Record<string, unknown>): void {
  emitLog(WEBHOOK_EVENTS.WEBHOOK_FAILED, metadata);
  void securityMonitoringService.reportWebhookSecurityEvent({
    type: THREAT_DETECTION_TYPES.WEBHOOK_FAILED,
    resource: "webhook",
    message: "Webhook delivery failed",
    metadata: { ...metadata, sanitized: true },
  });
}

export function emitWebhookRetry(metadata: Record<string, unknown>): void {
  emitLog(WEBHOOK_EVENTS.WEBHOOK_RETRY, metadata);
  void securityMonitoringService.reportWebhookSecurityEvent({
    type: THREAT_DETECTION_TYPES.WEBHOOK_RETRY,
    resource: "webhook",
    message: "Webhook delivery retry scheduled",
    metadata: { ...metadata, sanitized: true },
  });
}

export function emitWebhookSignatureInvalid(
  metadata: Record<string, unknown>,
): void {
  emitLog(WEBHOOK_EVENTS.WEBHOOK_SIGNATURE_INVALID, metadata);
  void securityMonitoringService.reportWebhookSecurityEvent({
    type: THREAT_DETECTION_TYPES.WEBHOOK_SIGNATURE_INVALID,
    resource: "webhook",
    message: "Webhook signature invalid",
    metadata: { ...metadata, sanitized: true },
  });
}

export function emitWebhookReplayAttack(
  metadata: Record<string, unknown>,
): void {
  emitLog(WEBHOOK_EVENTS.WEBHOOK_REPLAY_ATTACK, metadata);
  void securityMonitoringService.reportWebhookSecurityEvent({
    type: THREAT_DETECTION_TYPES.WEBHOOK_REPLAY_ATTACK,
    resource: "webhook",
    message: "Webhook replay attack detected",
    metadata: { ...metadata, sanitized: true },
  });
}

export function emitWebhookSecretRotated(
  metadata: Record<string, unknown>,
): void {
  emitLog(WEBHOOK_EVENTS.WEBHOOK_SECRET_ROTATED, metadata);
  void securityMonitoringService.reportWebhookSecurityEvent({
    type: THREAT_DETECTION_TYPES.WEBHOOK_SECRET_ROTATED,
    resource: "webhook",
    message: "Webhook signing secret rotated",
    metadata: { ...metadata, sanitized: true },
  });
}

export function emitWebhookDeadLetter(
  metadata: Record<string, unknown>,
): void {
  emitLog(WEBHOOK_EVENTS.WEBHOOK_DEAD_LETTER, metadata);
  void securityMonitoringService.reportWebhookSecurityEvent({
    type: THREAT_DETECTION_TYPES.WEBHOOK_DEAD_LETTER,
    resource: "webhook",
    message: "Webhook moved to dead letter queue",
    metadata: { ...metadata, sanitized: true },
  });
}
