/**
 * WebhookSecurityService — centralized signed webhook security layer.
 * Feature flag WEBHOOK_SECURITY_ENABLED defaults OFF.
 * Never exposes secrets or raw signatures in admin DTOs.
 */

import { randomUUID } from "node:crypto";

import { writeAuditLogSafe } from "../write-audit-log.js";
import {
  getWebhookSecurityConfig,
  isWebhookSecurityEnabled,
  resetWebhookSecurityConfigCache,
} from "./webhook.config.js";
import { WEBHOOK_AUDIT_ACTIONS } from "./webhook.constants.js";
import {
  deliverSignedWebhook,
  sanitizeUrlHost,
} from "./webhook.delivery.js";
import {
  emitWebhookCreated,
  emitWebhookDeadLetter,
  emitWebhookDelivered,
  emitWebhookFailed,
  emitWebhookReplayAttack,
  emitWebhookRetry,
  emitWebhookSecretRotated,
  emitWebhookSignatureInvalid,
  emitWebhookSigned,
} from "./webhook.events.js";
import {
  classifyFailure,
  nextRetryIso,
  shouldRetry,
} from "./webhook.retry.js";
import {
  createKeyId,
  createSecretMaterial,
  maskKeyId,
  signWebhookPayload,
  toSecurityHeaders,
} from "./webhook.signing.js";
import {
  cachePayload,
  clearPayload,
  getDelivery,
  listDeadLetters,
  listDeliveries,
  listRetrying,
  saveDelivery,
  takePayload,
  webhookMetrics,
} from "./webhook.store.js";
import { verifyWebhookRequest } from "./webhook.validation.js";
import type {
  DispatchWebhookInput,
  WebhookDeliveryRecord,
  WebhookSecurityDashboardMetrics,
  WebhookSecurityHeaders,
  WebhookSecurityStatusSnapshot,
  WebhookSignResult,
  WebhookVerifyInput,
  WebhookVerifyResult,
} from "./webhook.types.js";

/** Process-local rotation state (env remains authoritative until restart). */
let runtimePrimarySecret: string | null = null;
let runtimePreviousSecret: string | null = null;
let runtimeKeyId: string | null = null;
let runtimePreviousKeyId: string | null = null;

function activeSecret(): {
  secret: string | null;
  keyId: string;
  previousSecret: string | null;
  previousKeyId: string | null;
} {
  const cfg = getWebhookSecurityConfig();
  return {
    secret: runtimePrimarySecret ?? cfg.primarySecret,
    keyId: runtimeKeyId ?? cfg.keyId,
    previousSecret: runtimePreviousSecret ?? cfg.previousSecret,
    previousKeyId: runtimePreviousKeyId ?? cfg.previousKeyId,
  };
}

function serializePayload(payload: unknown): string {
  return typeof payload === "string" ? payload : JSON.stringify(payload);
}

function toPublicDelivery(record: WebhookDeliveryRecord): Omit<
  WebhookDeliveryRecord,
  "url" | "keyId"
> {
  const { url: _url, keyId: _keyId, ...rest } = record;
  return rest;
}

export class WebhookSecurityService {
  isEnabled(): boolean {
    return isWebhookSecurityEnabled();
  }

  getConfig() {
    return getWebhookSecurityConfig();
  }

  /**
   * Build signed EliteFlow security headers for an outbound body.
   * Used by SIEM / dispatchers when security is enabled.
   * Fail-closed: when security is enabled but no secret is configured, throws.
   */
  signOutbound(input: {
    body: string;
    eventId: string;
    deliveryId?: string;
  }): { headers: WebhookSecurityHeaders; signed: WebhookSignResult } | null {
    if (!isWebhookSecurityEnabled()) return null;
    const { secret, keyId } = activeSecret();
    if (!secret) {
      throw new Error(
        "WEBHOOK_SECURITY_ENABLED but WEBHOOK_SIGNING_SECRET is missing — refusing unsigned outbound webhook",
      );
    }

    const cfg = getWebhookSecurityConfig();
    const signed = signWebhookPayload({
      body: input.body,
      eventId: input.eventId,
      secret,
      keyId,
      algorithm: cfg.algorithm,
      deliveryId: input.deliveryId,
    });
    emitWebhookSigned({
      deliveryId: signed.deliveryId,
      keyIdMasked: maskKeyId(signed.keyId),
      algorithm: signed.algorithm,
    });
    return { headers: toSecurityHeaders(signed), signed };
  }

  /**
   * Dispatch a business webhook through the security layer.
   * When disabled, performs unsigned HTTPS POST (legacy-compatible).
   */
  async dispatch(
    input: DispatchWebhookInput,
  ): Promise<Omit<WebhookDeliveryRecord, "url" | "keyId">> {
    const cfg = getWebhookSecurityConfig();
    const body = serializePayload(input.payload);
    const deliveryId = randomUUID();
    const now = new Date().toISOString();
    const { secret, keyId } = activeSecret();

    const record: WebhookDeliveryRecord = {
      deliveryId,
      eventId: input.eventId,
      eventType: input.eventType,
      url: input.url,
      urlHost: sanitizeUrlHost(input.url),
      status: "QUEUED",
      attempt: 0,
      maxAttempts: isWebhookSecurityEnabled() ? cfg.maxRetries + 1 : 1,
      failureClass: null,
      lastError: null,
      httpStatus: null,
      keyId,
      keyIdMasked: maskKeyId(keyId),
      createdAt: now,
      updatedAt: now,
      nextRetryAt: null,
      deliveredAt: null,
      metadata: {
        payloadBytes: Buffer.byteLength(body, "utf8"),
        eventType: input.eventType,
        correlationId: input.correlationId ?? null,
      },
    };

    webhookMetrics.deliveries += 1;
    emitWebhookCreated({
      deliveryId,
      eventType: input.eventType,
      urlHost: record.urlHost,
    });
    cachePayload(deliveryId, body);
    await saveDelivery(record, cfg.deliveryTtlMs, cfg.historyLimit);

    return this.sendAttempt(record, body, input.headers, secret);
  }

  private async sendAttempt(
    record: WebhookDeliveryRecord,
    body: string,
    extraHeaders: Record<string, string> | undefined,
    secret: string | null,
  ): Promise<Omit<WebhookDeliveryRecord, "url" | "keyId">> {
    const cfg = getWebhookSecurityConfig();
    record.attempt += 1;
    record.status = "SENDING";
    record.updatedAt = new Date().toISOString();
    await saveDelivery(record, cfg.deliveryTtlMs, cfg.historyLimit);

    let result: {
      success: boolean;
      statusCode: number | null;
      error: string | null;
      deliveredAt: string;
    };

    if (isWebhookSecurityEnabled()) {
      if (!secret) {
        record.status = "FAILED";
        record.failureClass = "CONFIGURATION";
        record.lastError =
          "WEBHOOK_SECURITY_ENABLED but signing secret is missing — fail closed";
        record.updatedAt = new Date().toISOString();
        webhookMetrics.failures += 1;
        await saveDelivery(record, cfg.deliveryTtlMs, cfg.historyLimit);
        emitWebhookFailed({
          deliveryId: record.deliveryId,
          eventType: record.eventType,
          reason: "missing_signing_secret",
        });
        return toPublicDelivery(record);
      }
      const signed = signWebhookPayload({
        body,
        eventId: record.eventId,
        secret,
        keyId: record.keyId,
        algorithm: cfg.algorithm,
        deliveryId: record.deliveryId,
      });
      const securityHeaders = toSecurityHeaders(signed);
      emitWebhookSigned({
        deliveryId: record.deliveryId,
        keyIdMasked: record.keyIdMasked,
        algorithm: signed.algorithm,
      });
      result = await deliverSignedWebhook({
        url: record.url,
        body,
        securityHeaders,
        extraHeaders,
      });
    } else {
      result = await this.plainDeliver(record.url, body, extraHeaders);
    }

    return this.finalizeAttempt(record, result, body, extraHeaders, secret);
  }

  private async plainDeliver(
    url: string,
    body: string,
    extraHeaders?: Record<string, string>,
  ) {
    const deliveredAt = new Date().toISOString();
    try {
      const lower = url.trim().toLowerCase();
      if (
        lower.startsWith("http://") &&
        !lower.includes("localhost") &&
        !lower.includes("127.0.0.1")
      ) {
        return {
          success: false,
          statusCode: null,
          error: "Webhook endpoints must use HTTPS",
          deliveredAt,
        };
      }
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...extraHeaders,
        },
        body,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          success: false,
          statusCode: res.status,
          error: text.slice(0, 200) || `HTTP ${res.status}`,
          deliveredAt,
        };
      }
      return {
        success: true,
        statusCode: res.status,
        error: null,
        deliveredAt,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: null,
        error: error instanceof Error ? error.message : "Delivery failed",
        deliveredAt,
      };
    }
  }

  private async finalizeAttempt(
    record: WebhookDeliveryRecord,
    result: {
      success: boolean;
      statusCode: number | null;
      error: string | null;
      deliveredAt: string;
    },
    body: string,
    extraHeaders: Record<string, string> | undefined,
    secret: string | null,
  ): Promise<Omit<WebhookDeliveryRecord, "url" | "keyId">> {
    const cfg = getWebhookSecurityConfig();
    record.httpStatus = result.statusCode;
    record.updatedAt = new Date().toISOString();

    if (result.success) {
      record.status = "DELIVERED";
      record.deliveredAt = result.deliveredAt;
      record.lastError = null;
      record.failureClass = null;
      record.nextRetryAt = null;
      clearPayload(record.deliveryId);
      await saveDelivery(record, cfg.deliveryTtlMs, cfg.historyLimit);
      emitWebhookDelivered({
        deliveryId: record.deliveryId,
        httpStatus: result.statusCode,
        urlHost: record.urlHost,
      });
      return toPublicDelivery(record);
    }

    const failureClass = classifyFailure({
      httpStatus: result.statusCode,
      error: result.error,
    });
    record.failureClass = failureClass;
    record.lastError = result.error;
    webhookMetrics.failures += 1;

    emitWebhookFailed({
      deliveryId: record.deliveryId,
      failureClass,
      httpStatus: result.statusCode,
      urlHost: record.urlHost,
    });

    if (isWebhookSecurityEnabled() && shouldRetry(record, failureClass)) {
      record.status = "RETRYING";
      record.nextRetryAt = nextRetryIso(record.attempt);
      webhookMetrics.retries += 1;
      await saveDelivery(record, cfg.deliveryTtlMs, cfg.historyLimit);
      emitWebhookRetry({
        deliveryId: record.deliveryId,
        attempt: record.attempt,
        nextRetryAt: record.nextRetryAt,
      });

      const delay = Math.max(
        0,
        new Date(record.nextRetryAt).getTime() - Date.now(),
      );
      const timer = setTimeout(() => {
        void this.sendAttempt(record, body, extraHeaders, secret);
      }, delay);
      if (typeof timer.unref === "function") timer.unref();
      return toPublicDelivery(record);
    }

    record.status =
      record.attempt >= record.maxAttempts ? "DEAD_LETTER" : "FAILED";
    if (record.status === "DEAD_LETTER") {
      webhookMetrics.deadLetters += 1;
      emitWebhookDeadLetter({
        deliveryId: record.deliveryId,
        failureClass,
        attempt: record.attempt,
      });
    }
    record.nextRetryAt = null;
    clearPayload(record.deliveryId);
    await saveDelivery(record, cfg.deliveryTtlMs, cfg.historyLimit);
    return toPublicDelivery(record);
  }

  async verifyInbound(input: WebhookVerifyInput): Promise<WebhookVerifyResult> {
    const active = activeSecret();
    const secrets: Array<{ secret: string; keyId: string }> = [];
    if (active.secret) {
      secrets.push({ secret: active.secret, keyId: active.keyId });
    }
    if (active.previousSecret) {
      secrets.push({
        secret: active.previousSecret,
        keyId: active.previousKeyId ?? `${active.keyId}_prev`,
      });
    }

    const result = await verifyWebhookRequest({ ...input, secrets });
    if (!result.valid) {
      if (result.replay) {
        webhookMetrics.replayAttacks += 1;
        emitWebhookReplayAttack({ reason: result.reason });
      } else {
        webhookMetrics.signatureFailures += 1;
        emitWebhookSignatureInvalid({ reason: result.reason });
      }
    }
    return result;
  }

  async rotateSecret(input: {
    actorUserId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ keyIdMasked: string; previousKeyIdMasked: string | null }> {
    const current = activeSecret();
    const newSecret = createSecretMaterial();
    const newKeyId = createKeyId();

    runtimePreviousSecret = current.secret;
    runtimePreviousKeyId = current.keyId;
    runtimePrimarySecret = newSecret;
    runtimeKeyId = newKeyId;

    emitWebhookSecretRotated({
      keyIdMasked: maskKeyId(newKeyId),
      previousKeyIdMasked: current.keyId ? maskKeyId(current.keyId) : null,
    });

    void writeAuditLogSafe(
      {
        userId: input.actorUserId,
        action: WEBHOOK_AUDIT_ACTIONS.ROTATE,
        resource: "webhook_secret",
        resourceId: maskKeyId(newKeyId),
        metadata: {
          previousKeyIdMasked: current.keyId
            ? maskKeyId(current.keyId)
            : null,
        },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
      "webhook-security",
    );

    return {
      keyIdMasked: maskKeyId(newKeyId),
      previousKeyIdMasked: current.keyId ? maskKeyId(current.keyId) : null,
    };
  }

  async retryDelivery(deliveryId: string): Promise<
    Omit<WebhookDeliveryRecord, "url" | "keyId">
  > {
    const existing = await getDelivery(deliveryId);
    if (!existing) {
      throw new WebhookSecurityError("Delivery not found", 404);
    }
    if (
      existing.status !== "FAILED" &&
      existing.status !== "DEAD_LETTER" &&
      existing.status !== "RETRYING" &&
      existing.status !== "EXPIRED"
    ) {
      throw new WebhookSecurityError(
        "Delivery is not in a retryable state",
        400,
      );
    }

    const body = takePayload(deliveryId);
    if (!body) {
      throw new WebhookSecurityError(
        "Payload no longer retained — re-dispatch the event",
        400,
      );
    }

    const { secret } = activeSecret();
    existing.status = "RETRYING";
    // Allow one more attempt budget bump for admin-forced retry
    existing.maxAttempts = Math.max(existing.maxAttempts, existing.attempt + 1);
    return this.sendAttempt(existing, body, undefined, secret);
  }

  getStatus(): WebhookSecurityStatusSnapshot {
    const cfg = getWebhookSecurityConfig();
    const { keyId } = activeSecret();
    return {
      enabled: cfg.enabled,
      algorithm: cfg.algorithm,
      keyIdMasked: maskKeyId(keyId),
      hasPreviousSecret: Boolean(activeSecret().previousSecret),
      timestampToleranceSeconds: cfg.timestampToleranceSeconds,
      maxRetries: cfg.maxRetries,
      deliveries: webhookMetrics.deliveries,
      failures: webhookMetrics.failures,
      retries: webhookMetrics.retries,
      replayAttacks: webhookMetrics.replayAttacks,
      signatureFailures: webhookMetrics.signatureFailures,
      deadLetters: webhookMetrics.deadLetters,
      evaluatedAt: new Date().toISOString(),
    };
  }

  getDeliveries(limit = 50): Array<Omit<WebhookDeliveryRecord, "url" | "keyId">> {
    return listDeliveries(limit).map(toPublicDelivery);
  }

  getRetries(limit = 50): Array<Omit<WebhookDeliveryRecord, "url" | "keyId">> {
    return listRetrying(limit).map(toPublicDelivery);
  }

  getDeadLetters(limit = 50): Array<Omit<WebhookDeliveryRecord, "url" | "keyId">> {
    return listDeadLetters(limit).map(toPublicDelivery);
  }

  getDashboardMetrics(): WebhookSecurityDashboardMetrics {
    return {
      deliveries: webhookMetrics.deliveries,
      failures: webhookMetrics.failures,
      retries: webhookMetrics.retries,
      replayAttacks: webhookMetrics.replayAttacks,
      signatureFailures: webhookMetrics.signatureFailures,
      deadLetters: webhookMetrics.deadLetters,
    };
  }
}

export class WebhookSecurityError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "WebhookSecurityError";
    this.statusCode = statusCode;
  }
}

export const webhookSecurityService = new WebhookSecurityService();

export { resetWebhookSecurityConfigCache };
