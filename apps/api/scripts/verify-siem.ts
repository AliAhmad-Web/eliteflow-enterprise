/**
 * EliteFlow SIEM verification — exercises config, redaction, normalize,
 * queue/retry bounds, TLS assertion, and HTTP timeout without enabling
 * production delivery.
 *
 * Run: npx tsx --env-file=.env scripts/verify-siem.ts
 * (from apps/api)
 */

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";

import {
  getSiemConfig,
  isSiemEnabled,
  resetSiemConfigCache,
} from "../src/shared/security/siem/siem.config.js";
import {
  createTestSiemEvent,
  normalizeAuditEvent,
} from "../src/shared/security/siem/siem.normalize.js";
import { redactSiemMetadata } from "../src/shared/security/siem/siem.redaction.js";
import { assertTlsEndpoint } from "../src/shared/security/siem/siem.auth.js";
import { SiemQueue } from "../src/shared/security/siem/siem.queue.js";
import { SiemCircuitBreaker } from "../src/shared/security/siem/siem.circuit-breaker.js";
import { deliverViaTransport } from "../src/shared/security/siem/siem.transport.js";
import { siemIntegrationService } from "../src/shared/security/siem/siem.service.js";
import type { SiemRuntimeProviderConfig } from "../src/shared/security/siem/siem.types.js";

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      results.push({ name, ok: true });
      console.log(`  PASS  ${name}`);
    })
    .catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      results.push({ name, ok: false, detail });
      console.error(`  FAIL  ${name}: ${detail}`);
    });
}

async function withEnv(
  overrides: Record<string, string | undefined>,
  fn: () => void | Promise<void>,
): Promise<void> {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetSiemConfigCache();
  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    resetSiemConfigCache();
  }
}

async function main(): Promise<void> {
  console.log("\nEliteFlow SIEM verification\n");

  await check("1. SIEM disabled by default / env off", async () => {
    await withEnv(
      {
        SECURITY_SIEM_ENABLED: "false",
        SIEM_ENABLED: "false",
      },
      () => {
        assert.equal(isSiemEnabled(), false);
        const status = siemIntegrationService.getStatus();
        assert.equal(status.enabled, false);
        assert.equal(status.connectionStatus, "DISABLED");
      },
    );
  });

  await check("2. SIEM enabled reads existing SECURITY_SIEM_* / SIEM_* names", async () => {
    await withEnv(
      {
        SECURITY_SIEM_ENABLED: "true",
        SIEM_PROVIDERS: "GENERIC_WEBHOOK",
        SIEM_GENERIC_WEBHOOK_ENDPOINT: "https://siem.example.com/ingest",
        SIEM_GENERIC_WEBHOOK_AUTH_MODE: "BEARER",
        SIEM_GENERIC_WEBHOOK_BEARER_TOKEN: "test-token-not-real",
        SIEM_REQUEST_TIMEOUT_MS: "2500",
      },
      () => {
        assert.equal(isSiemEnabled(), true);
        const cfg = getSiemConfig();
        assert.equal(cfg.requestTimeoutMs, 2500);
        assert.equal(cfg.maxRetries, 5);
        const generic = cfg.providers.find((p) => p.provider === "GENERIC_WEBHOOK");
        assert.ok(generic?.enabled);
        assert.equal(generic?.endpoint, "https://siem.example.com/ingest");
        assert.equal(generic?.bearerToken, "test-token-not-real");
        const snapshot = siemIntegrationService.getConfig();
        assert.ok(snapshot.providers[0]);
        assert.equal(
          snapshot.providers.find((p) => p.provider === "GENERIC_WEBHOOK")
            ?.hasCredential,
          true,
        );
        assert.ok(
          !JSON.stringify(snapshot).includes("test-token-not-real"),
          "config snapshot must not expose bearer token",
        );
      },
    );
  });

  await check("3. Secret redaction before SIEM delivery", () => {
    const redacted = redactSiemMetadata({
      password: "super-secret",
      accessToken: "tok_abc",
      refreshToken: "ref_abc",
      apiKey: "key_abc",
      jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signature",
      serviceRoleKey: "sb_secret_should_not_leave",
      encryptionKey: "enc-key",
      captchaSecret: "captcha",
      oauthClientSecret: "oauth-secret",
      safeAction: "login_failed",
      userId: "user-1",
    });
    assert.equal(redacted.password, "[REDACTED]");
    assert.equal(redacted.accessToken, "[REDACTED]");
    assert.equal(redacted.refreshToken, "[REDACTED]");
    assert.equal(redacted.apiKey, "[REDACTED]");
    assert.equal(redacted.jwt, "[REDACTED]");
    assert.equal(redacted.serviceRoleKey, "[REDACTED]");
    assert.equal(redacted.encryptionKey, "[REDACTED]");
    assert.equal(redacted.captchaSecret, "[REDACTED]");
    assert.equal(redacted.oauthClientSecret, "[REDACTED]");
    assert.equal(redacted.safeAction, "login_failed");
    assert.equal(redacted.userId, "user-1");
  });

  await check("4. Normalized audit event + synthetic test event", () => {
    const event = normalizeAuditEvent({
      userId: "u1",
      action: "auth.login_failed",
      resource: "auth",
      metadata: {
        password: "nope",
        result: "failure",
        severity: "HIGH",
      },
      ipAddress: "203.0.113.10",
    });
    assert.ok(event.eventId);
    assert.equal(event.eventType, "auth.login_failed");
    assert.equal(event.result, "failure");
    assert.equal(event.severity, "HIGH");
    assert.equal(event.metadata.password, "[REDACTED]");
    assert.equal(event.metadata.source, "audit");

    const test = createTestSiemEvent();
    assert.equal(test.eventType, "SIEM_CONNECTIVITY_TEST");
    assert.equal(test.metadata.isTest, true);
    assert.equal(test.metadata.synthetic, true);
  });

  await check("5. TLS endpoint assertion rejects cleartext remote URLs", () => {
    assert.throws(() => assertTlsEndpoint("http://evil.example.com/siem"));
    assert.doesNotThrow(() =>
      assertTlsEndpoint("https://siem.example.com/ingest"),
    );
  });

  await check("6. Queue retry / DLQ bounds (no infinite loop)", () => {
    const queue = new SiemQueue(10);
    const event = createTestSiemEvent();
    const item = queue.enqueue(event, ["GENERIC_WEBHOOK"]);
    assert.ok(item);
    for (let i = 0; i < 3; i += 1) {
      const ready = queue.dequeueReady(1);
      assert.equal(ready.length, 1);
      queue.requeue(ready[0]!, 0, "fail");
    }
    assert.equal(queue.retrySize, 1);
    const last = queue.dequeueReady(1)[0]!;
    queue.toDeadLetter(last, "max");
    assert.equal(queue.deadLetterSize, 1);
    const retried = queue.drainDeadLetter(1);
    assert.equal(retried.length, 1);
    assert.equal(queue.deadLetterSize, 0);
  });

  await check("7. Circuit breaker opens after threshold", () => {
    const circuit = new SiemCircuitBreaker(2, 30_000);
    assert.equal(circuit.canAttempt("GENERIC_WEBHOOK"), true);
    circuit.recordFailure("GENERIC_WEBHOOK");
    assert.equal(circuit.canAttempt("GENERIC_WEBHOOK"), true);
    circuit.recordFailure("GENERIC_WEBHOOK");
    assert.equal(circuit.canAttempt("GENERIC_WEBHOOK"), false);
  });

  await check("8. HTTP timeout returns structured failure (no throw)", async () => {
    const server = createServer((_req, res) => {
      // Never respond — force client abort
      void res;
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const addr = server.address();
    assert.ok(addr && typeof addr === "object");
    const port = addr.port;

    await withEnv({ SIEM_REQUEST_TIMEOUT_MS: "200" }, async () => {
      const cfg: SiemRuntimeProviderConfig = {
        provider: "GENERIC_WEBHOOK",
        enabled: true,
        transport: "HTTPS_WEBHOOK",
        endpoint: `http://127.0.0.1:${port}/ingest`,
        authMode: "NONE",
        apiKey: null,
        bearerToken: null,
        webhookSigningSecret: null,
        syslogTarget: null,
      };
      const result = await deliverViaTransport([createTestSiemEvent()], cfg);
      assert.equal(result.success, false);
      assert.match(result.error ?? "", /timeout|aborted|ECONN|failed/i);
    });

    server.close();
    await once(server, "close").catch(() => undefined);
  });

  await check("9. Auth failure surfaces HTTP status (no crash)", async () => {
    const server = createServer((_req, res) => {
      res.writeHead(401, { "Content-Type": "text/plain" });
      res.end("unauthorized");
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const addr = server.address();
    assert.ok(addr && typeof addr === "object");

    const cfg: SiemRuntimeProviderConfig = {
      provider: "GENERIC_WEBHOOK",
      enabled: true,
      transport: "HTTPS_WEBHOOK",
      endpoint: `http://127.0.0.1:${addr.port}/ingest`,
      authMode: "BEARER",
      apiKey: null,
      bearerToken: "bad-token",
      webhookSigningSecret: null,
      syslogTarget: null,
    };
    const result = await deliverViaTransport([createTestSiemEvent()], cfg);
    assert.equal(result.success, false);
    assert.equal(result.statusCode, 401);

    server.close();
    await once(server, "close").catch(() => undefined);
  });

  await check("10. Status snapshot never includes secrets", async () => {
    await withEnv(
      {
        SECURITY_SIEM_ENABLED: "true",
        SIEM_GENERIC_WEBHOOK_BEARER_TOKEN: "super-secret-bearer",
        SIEM_GENERIC_WEBHOOK_ENDPOINT: "https://siem.example.com/path/secret",
      },
      () => {
        const status = JSON.stringify(siemIntegrationService.getStatus());
        const config = JSON.stringify(siemIntegrationService.getConfig());
        assert.ok(!status.includes("super-secret-bearer"));
        assert.ok(!config.includes("super-secret-bearer"));
        assert.ok(!config.includes("/path/secret"));
      },
    );
  });

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed\n`,
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
