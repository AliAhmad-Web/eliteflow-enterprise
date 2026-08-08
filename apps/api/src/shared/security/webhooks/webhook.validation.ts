/**
 * Webhook inbound verification — signature, timestamp, nonce, payload hash, key version.
 */

import { getWebhookSecurityConfig } from "./webhook.config.js";
import {
  hashPayload,
  verifyWebhookSignature,
} from "./webhook.signing.js";
import type {
  WebhookVerifyInput,
  WebhookVerifyResult,
} from "./webhook.types.js";
import { consumeNonce, isNonceUsed } from "./webhook.store.js";

export async function verifyWebhookRequest(
  input: WebhookVerifyInput & {
    /** Override secrets (e.g. after in-process rotation). */
    secrets?: Array<{ secret: string; keyId: string }>;
  },
): Promise<WebhookVerifyResult> {
  const cfg = getWebhookSecurityConfig();

  const ts = Number.parseInt(input.timestamp, 10);
  if (!Number.isFinite(ts)) {
    return { valid: false, reason: "invalid_timestamp" };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > cfg.timestampToleranceSeconds) {
    return { valid: false, reason: "timestamp_out_of_tolerance", replay: true };
  }

  if (await isNonceUsed(input.nonce)) {
    return { valid: false, reason: "nonce_replay", replay: true };
  }

  const secrets: Array<{ secret: string; keyId: string }> =
    input.secrets?.length
      ? input.secrets
      : [
          ...(cfg.primarySecret
            ? [{ secret: cfg.primarySecret, keyId: cfg.keyId }]
            : []),
          ...(cfg.previousSecret
            ? [
                {
                  secret: cfg.previousSecret,
                  keyId: cfg.previousKeyId ?? `${cfg.keyId}_prev`,
                },
              ]
            : []),
        ];

  if (secrets.length === 0) {
    return { valid: false, reason: "no_signing_secret_configured" };
  }

  // Prefer matching keyId when provided.
  const ordered = input.keyId
    ? [
        ...secrets.filter((s) => s.keyId === input.keyId),
        ...secrets.filter((s) => s.keyId !== input.keyId),
      ]
    : secrets;

  let matched = false;
  for (const entry of ordered) {
    const ok = verifyWebhookSignature({
      body: input.body,
      eventId: input.eventId,
      signature: input.signature,
      timestamp: input.timestamp,
      nonce: input.nonce,
      secret: entry.secret,
      algorithm: cfg.algorithm,
    });
    if (ok) {
      matched = true;
      break;
    }
  }

  if (!matched) {
    return { valid: false, reason: "signature_mismatch" };
  }

  // Payload hash is embedded in the signing string — recomputed during verify.
  // Explicit check for clarity / auditing.
  const payloadHash = hashPayload(input.body);
  if (!payloadHash) {
    return { valid: false, reason: "payload_hash_invalid" };
  }

  await consumeNonce(input.nonce, cfg.timestampToleranceSeconds * 1000 * 2);

  return { valid: true };
}
