/**
 * Webhook signing — HMAC SHA-256/512 with secret versioning.
 * Never logs or returns plaintext secrets.
 */

import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import type {
  WebhookAlgorithm,
  WebhookSecurityHeaders,
  WebhookSignResult,
} from "./webhook.types.js";
import { WEBHOOK_HEADERS } from "./webhook.constants.js";

export function hashPayload(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

export function buildSigningString(input: {
  timestamp: string;
  nonce: string;
  eventId: string;
  payloadHash: string;
}): string {
  return [
    input.timestamp,
    input.nonce,
    input.eventId,
    input.payloadHash,
  ].join(".");
}

function hmac(
  algorithm: WebhookAlgorithm,
  secret: string,
  signingString: string,
): string {
  const alg = algorithm === "HMAC_SHA512" ? "sha512" : "sha256";
  return createHmac(alg, secret).update(signingString).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function signWebhookPayload(input: {
  body: string;
  eventId: string;
  secret: string;
  keyId: string;
  algorithm: WebhookAlgorithm;
  deliveryId?: string;
}): WebhookSignResult {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("hex");
  const deliveryId = input.deliveryId ?? randomUUID();
  const payloadHash = hashPayload(input.body);
  const signingString = buildSigningString({
    timestamp,
    nonce,
    eventId: input.eventId,
    payloadHash,
  });
  const signature = hmac(input.algorithm, input.secret, signingString);

  return {
    signature,
    timestamp,
    nonce,
    deliveryId,
    keyId: input.keyId,
    payloadHash,
    algorithm: input.algorithm,
    signingString,
  };
}

export function toSecurityHeaders(
  signed: WebhookSignResult,
): WebhookSecurityHeaders {
  return {
    [WEBHOOK_HEADERS.SIGNATURE]: signed.signature,
    [WEBHOOK_HEADERS.TIMESTAMP]: signed.timestamp,
    [WEBHOOK_HEADERS.NONCE]: signed.nonce,
    [WEBHOOK_HEADERS.DELIVERY]: signed.deliveryId,
    [WEBHOOK_HEADERS.KEY_ID]: signed.keyId,
  };
}

export function verifyWebhookSignature(input: {
  body: string;
  eventId: string;
  signature: string;
  timestamp: string;
  nonce: string;
  secret: string;
  algorithm: WebhookAlgorithm;
}): boolean {
  const payloadHash = hashPayload(input.body);
  const signingString = buildSigningString({
    timestamp: input.timestamp,
    nonce: input.nonce,
    eventId: input.eventId,
    payloadHash,
  });
  const expected = hmac(input.algorithm, input.secret, signingString);
  return safeEqualHex(expected, input.signature);
}

export function maskKeyId(keyId: string): string {
  if (keyId.length <= 6) return "whsec_****";
  return `${keyId.slice(0, 6)}…${keyId.slice(-2)}`;
}

export function createKeyId(): string {
  return `whsec_${randomBytes(8).toString("hex")}`;
}

export function createSecretMaterial(): string {
  return randomBytes(32).toString("hex");
}
