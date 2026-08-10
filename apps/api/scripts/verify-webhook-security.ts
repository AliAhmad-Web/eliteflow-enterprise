/**
 * P1 verification — webhook signing + inbound verification.
 * Run: npx tsx scripts/verify-webhook-security.ts
 * (from apps/api)
 */

import assert from "node:assert/strict";

import {
  getWebhookSecurityConfig,
  resetWebhookSecurityConfigCache,
  signWebhookPayload,
  verifyWebhookRequest,
  toSecurityHeaders,
} from "../src/shared/security/webhooks/index.js";
import { WebhookSecurityService } from "../src/shared/security/webhooks/webhook.service.js";

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];

async function check(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, detail });
    console.error(`  FAIL  ${name}: ${detail}`);
  }
}

async function withEnv(
  overrides: Record<string, string | undefined>,
  fn: () => Promise<void> | void,
): Promise<void> {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetWebhookSecurityConfigCache();
  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    resetWebhookSecurityConfigCache();
  }
}

async function main(): Promise<void> {
  console.log("\nWebhook security verification\n");

  const secret = "a".repeat(64);
  const body = JSON.stringify({ hello: "world" });
  const eventId = "evt_test_1";

  await withEnv(
    {
      WEBHOOK_SECURITY_ENABLED: "true",
      WEBHOOK_SIGNING_SECRET: secret,
      NODE_ENV: "test",
    },
    async () => {
      await check("valid signature verifies", async () => {
        const signed = signWebhookPayload({
          body,
          eventId,
          secret,
          keyId: "whsec_primary",
          algorithm: "HMAC_SHA256",
        });
        const ok = await verifyWebhookRequest({
          body,
          signature: signed.signature,
          timestamp: signed.timestamp,
          nonce: signed.nonce,
          eventId,
          keyId: signed.keyId,
          secrets: [{ secret, keyId: "whsec_primary" }],
        });
        assert.equal(ok.valid, true);
      });

      await check("invalid signature rejected", async () => {
        const signed = signWebhookPayload({
          body,
          eventId,
          secret,
          keyId: "whsec_primary",
          algorithm: "HMAC_SHA256",
        });
        const ok = await verifyWebhookRequest({
          body,
          signature: "00".repeat(32),
          timestamp: signed.timestamp,
          nonce: signed.nonce + "ff",
          eventId,
          secrets: [{ secret, keyId: "whsec_primary" }],
        });
        assert.equal(ok.valid, false);
        assert.equal(ok.reason, "signature_mismatch");
      });

      await check("expired timestamp rejected", async () => {
        const signed = signWebhookPayload({
          body,
          eventId,
          secret,
          keyId: "whsec_primary",
          algorithm: "HMAC_SHA256",
        });
        const oldTs = (Math.floor(Date.now() / 1000) - 10_000).toString();
        const ok = await verifyWebhookRequest({
          body,
          signature: signed.signature,
          timestamp: oldTs,
          nonce: signed.nonce + "01",
          eventId,
          secrets: [{ secret, keyId: "whsec_primary" }],
        });
        assert.equal(ok.valid, false);
        assert.equal(ok.reason, "timestamp_out_of_tolerance");
      });

      await check("replayed nonce rejected", async () => {
        const signed = signWebhookPayload({
          body,
          eventId: "evt_replay",
          secret,
          keyId: "whsec_primary",
          algorithm: "HMAC_SHA256",
        });
        const first = await verifyWebhookRequest({
          body,
          signature: signed.signature,
          timestamp: signed.timestamp,
          nonce: signed.nonce,
          eventId: "evt_replay",
          secrets: [{ secret, keyId: "whsec_primary" }],
        });
        assert.equal(first.valid, true);
        const second = await verifyWebhookRequest({
          body,
          signature: signed.signature,
          timestamp: signed.timestamp,
          nonce: signed.nonce,
          eventId: "evt_replay",
          secrets: [{ secret, keyId: "whsec_primary" }],
        });
        assert.equal(second.valid, false);
        assert.equal(second.reason, "nonce_replay");
      });

      await check("payload mismatch rejected", async () => {
        const signed = signWebhookPayload({
          body,
          eventId: "evt_payload",
          secret,
          keyId: "whsec_primary",
          algorithm: "HMAC_SHA256",
        });
        const ok = await verifyWebhookRequest({
          body: JSON.stringify({ hello: "tampered" }),
          signature: signed.signature,
          timestamp: signed.timestamp,
          nonce: signed.nonce + "ab",
          eventId: "evt_payload",
          secrets: [{ secret, keyId: "whsec_primary" }],
        });
        assert.equal(ok.valid, false);
      });

      await check("key rotation accepts previous secret", async () => {
        const previous = "b".repeat(64);
        const signed = signWebhookPayload({
          body,
          eventId: "evt_rot",
          secret: previous,
          keyId: "whsec_prev",
          algorithm: "HMAC_SHA256",
        });
        const ok = await verifyWebhookRequest({
          body,
          signature: signed.signature,
          timestamp: signed.timestamp,
          nonce: signed.nonce,
          eventId: "evt_rot",
          keyId: "whsec_prev",
          secrets: [
            { secret, keyId: "whsec_primary" },
            { secret: previous, keyId: "whsec_prev" },
          ],
        });
        assert.equal(ok.valid, true);
      });

      await check("headers include timestamp/nonce/signature", async () => {
        const signed = signWebhookPayload({
          body,
          eventId,
          secret,
          keyId: "whsec_primary",
          algorithm: "HMAC_SHA256",
        });
        const headers = toSecurityHeaders(signed);
        assert.ok(headers["X-EliteFlow-Signature"]);
        assert.ok(headers["X-EliteFlow-Timestamp"]);
        assert.ok(headers["X-EliteFlow-Nonce"]);
      });
    },
  );

  await withEnv(
    {
      WEBHOOK_SECURITY_ENABLED: "true",
      WEBHOOK_SIGNING_SECRET: undefined,
      NODE_ENV: "test",
    },
    async () => {
      await check("enabled without secret fails closed on signOutbound", async () => {
        const svc = new WebhookSecurityService();
        assert.throws(() =>
          svc.signOutbound({ body, eventId: "evt_fail" }),
        );
      });

      await check("enabled without secret dispatch fails closed", async () => {
        const svc = new WebhookSecurityService();
        const delivery = await svc.dispatch({
          url: "https://example.com/hooks",
          eventId: "evt_dispatch_fail",
          eventType: "test.event",
          payload: { ok: true },
        });
        assert.equal(delivery.status, "FAILED");
        assert.equal(delivery.failureClass, "CONFIGURATION");
      });
    },
  );

  await withEnv(
    {
      WEBHOOK_SECURITY_ENABLED: undefined,
      NODE_ENV: "production",
      WEBHOOK_SIGNING_SECRET: secret,
    },
    async () => {
      await check("production defaults webhook security ON", async () => {
        assert.equal(getWebhookSecurityConfig(true).enabled, true);
      });
    },
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed\n`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
