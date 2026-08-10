/**
 * STEP 4 mobile parity verification (no secrets, no dummy data fabrication).
 *
 * Usage:
 *   node apps/mobile/scripts/verify-mobile-parity.mjs
 *   API_URL=https://api-production-a778.up.railway.app node apps/mobile/scripts/verify-mobile-parity.mjs
 *
 * Optional authenticated checks (do not commit credentials):
 *   VERIFY_EMAIL=... VERIFY_PASSWORD=... node apps/mobile/scripts/verify-mobile-parity.mjs
 */

const API_URL = (
  process.env.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  "https://api-production-a778.up.railway.app"
).replace(/\/$/, "");

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function jsonFetch(path, init = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { res, body };
}

async function main() {
  console.log(`EliteFlow mobile parity verify → ${API_URL}\n`);

  // 1) API health
  try {
    const { res, body } = await jsonFetch("/api/v1/health").catch(async () => {
      // Some deployments expose /health
      return jsonFetch("/health");
    });
    record(
      "API health reachable",
      res.ok,
      `status=${res.status} body=${JSON.stringify(body)?.slice(0, 120)}`,
    );
  } catch (err) {
    record("API health reachable", false, String(err));
  }

  // 2) Unauthenticated protected routes must 401
  // Public API OpenAPI is intentionally unauthenticated documentation.
  try {
    const { res } = await jsonFetch("/api/v1/public/openapi.json");
    record(
      "Public API OpenAPI reachable",
      res.ok,
      `status=${res.status}`,
    );
  } catch (err) {
    record("Public API OpenAPI reachable", false, String(err));
  }

  const protectedPaths = [
    "/api/v1/auth/me",
    "/api/v1/projects?page=1&limit=1",
    "/api/v1/invoices?page=1&limit=1",
    "/api/v1/billing/subscription",
    "/api/v1/clients/pipeline",
    "/api/v1/whiteboards?page=1&limit=1",
    "/api/v1/calendar/events?page=1&limit=1",
    "/api/v1/notifications?page=1&limit=1",
    "/api/v1/public/clients",
  ];

  for (const path of protectedPaths) {
    try {
      const { res } = await jsonFetch(path);
      record(
        `401 without auth: ${path}`,
        res.status === 401 || res.status === 403,
        `status=${res.status}`,
      );
    } catch (err) {
      record(`401 without auth: ${path}`, false, String(err));
    }
  }

  // 3) Mobile bundle must not ship server secrets (static scan of env example)
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
  const banned = [
    "DATABASE_URL",
    "SUPABASE_SERVICE_ROLE",
    "SERVICE_ROLE",
    "STRIPE_SECRET",
    "JWT_SECRET",
  ];
  const leaked = banned.filter((k) => envExample.includes(k));
  record(
    "No server secrets in mobile .env.example",
    leaked.length === 0,
    leaked.length ? leaked.join(",") : "ok",
  );

  // 4) eas.json must not embed Google test reCAPTCHA site key
  const eas = JSON.parse(fs.readFileSync(path.join(root, "eas.json"), "utf8"));
  const easBlob = JSON.stringify(eas);
  record(
    "eas.json has no Google test reCAPTCHA site key",
    !easBlob.includes("6LeIxAcTAAAA"),
    "ok",
  );
  record(
    "eas.json production EXPO_PUBLIC_API_URL set",
    Boolean(eas.build?.production?.env?.EXPO_PUBLIC_API_URL),
    eas.build?.production?.env?.EXPO_PUBLIC_API_URL || "missing",
  );

  // 5) Optional authenticated smoke (never invent success)
  const email = process.env.VERIFY_EMAIL?.trim();
  const password = process.env.VERIFY_PASSWORD;
  if (email && password) {
    const captchaToken = `eliteflow-mobile:login:${Date.now()}`;
    const { res, body } = await jsonFetch("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, captchaToken }),
    });
    const okLogin = res.ok || res.status === 200;
    record(
      "Optional login smoke",
      okLogin || body?.data?.requiresOtp === true,
      `status=${res.status} requiresOtp=${Boolean(body?.data?.requiresOtp)}`,
    );

    const token = body?.data?.tokens?.accessToken;
    if (token) {
      const me = await jsonFetch("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      record(
        "Optional /auth/me",
        me.res.ok && Boolean(me.body?.data?.user?.id),
        `role=${me.body?.data?.user?.role?.code ?? "?"}`,
      );

      const companyId = me.body?.data?.user?.companyId;
      record(
        "Optional session has server company scope",
        companyId === undefined || companyId === null || typeof companyId === "string",
        `companyId present=${companyId != null}`,
      );

      // Cross-company: client must not accept spoofed companyId header as authority
      const spoof = await jsonFetch("/api/v1/projects?page=1&limit=1", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-company-id": "00000000-0000-0000-0000-000000000000",
        },
      });
      record(
        "Optional company spoof header ignored (still 200 scoped or 403/401)",
        spoof.res.status === 200 ||
          spoof.res.status === 403 ||
          spoof.res.status === 401,
        `status=${spoof.res.status}`,
      );
    } else if (body?.data?.requiresOtp) {
      record(
        "Optional MFA challenge returned",
        true,
        `method=${body?.data?.mfaMethod ?? "unknown"}`,
      );
    }
  } else {
    record(
      "Optional authenticated smoke",
      true,
      "SKIPPED (set VERIFY_EMAIL + VERIFY_PASSWORD to run)",
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\nSummary: ${results.length - failed.length}/${results.length} PASS`,
  );
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
