/**
 * SIEM delivery authentication + outbound payload HMAC signing.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import type { SiemAuthMode, SiemRuntimeProviderConfig } from "./siem.types.js";

export function buildAuthHeaders(
  config: SiemRuntimeProviderConfig,
): Record<string, string> {
  const headers: Record<string, string> = {};
  const mode: SiemAuthMode = config.authMode;

  if (mode === "API_KEY" && config.apiKey) {
    headers["Authorization"] = `Splunk ${config.apiKey}`;
    headers["X-API-Key"] = config.apiKey;
  } else if (mode === "BEARER" && config.bearerToken) {
    headers["Authorization"] = `Bearer ${config.bearerToken}`;
  } else if (config.bearerToken) {
    headers["Authorization"] = `Bearer ${config.bearerToken}`;
  } else if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
    headers["X-API-Key"] = config.apiKey;
  }

  return headers;
}

/** Outbound HMAC-SHA256 payload signature (delivery integrity). */
export function signPayload(
  body: string,
  secret: string | null | undefined,
): { signature: string; timestamp: string } | null {
  if (!secret) return null;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return { signature, timestamp };
}

export function applySignatureHeaders(
  headers: Record<string, string>,
  body: string,
  secret: string | null | undefined,
): Record<string, string> {
  const signed = signPayload(body, secret);
  if (!signed) return headers;
  return {
    ...headers,
    "X-SIEM-Signature": signed.signature,
    "X-SIEM-Timestamp": signed.timestamp,
    "X-SIEM-Signature-Alg": "hmac-sha256",
  };
}

export function verifySignature(
  body: string,
  signature: string,
  timestamp: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

/** Enforce TLS for network endpoints. */
export function assertTlsEndpoint(endpoint: string | null): void {
  if (!endpoint) return;
  const lower = endpoint.trim().toLowerCase();
  const isLoopback =
    lower.includes("localhost") || lower.includes("127.0.0.1");

  if (lower.startsWith("http://") && !isLoopback) {
    throw new Error("SIEM endpoints must use HTTPS (TLS only)");
  }
  if (
    !lower.startsWith("https://") &&
    !lower.startsWith("tls://") &&
    !lower.startsWith("ssl://")
  ) {
    // Allow local cleartext for verification/dev only.
    if (lower.startsWith("http://") && isLoopback) {
      return;
    }
    // Allow relative / syslog host:port handled elsewhere
    if (lower.includes("://")) {
      throw new Error("SIEM network transports require TLS");
    }
  }
}
