/**
 * STEP 5 — Final production readiness verification.
 *
 * Covers mobile config, secret hygiene, EAS profile, production API/web smoke.
 * Does not invent credentials or claim store submission.
 *
 *   node apps/mobile/scripts/verify-step5-production.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_URL = (
  process.env.API_URL || "https://api-production-a778.up.railway.app"
).replace(/\/$/, "");
const WEB_URL = (
  process.env.WEB_URL || "https://eliteflow-web.vercel.app"
).replace(/\/$/, "");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchStatus(url, init) {
  const res = await fetch(url, init);
  return res;
}

async function main() {
  console.log(`EliteFlow STEP 5 production verify`);
  console.log(`API=${API_URL}`);
  console.log(`WEB=${WEB_URL}\n`);

  // --- Mobile config ---
  const eas = JSON.parse(fs.readFileSync(path.join(root, "eas.json"), "utf8"));
  const appJson = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
  const prodApi = eas.build?.production?.env?.EXPO_PUBLIC_API_URL;
  const apkApi = eas.build?.["production-apk"]?.env?.EXPO_PUBLIC_API_URL;

  record(
    "EAS production API URL",
    prodApi === "https://api-production-a778.up.railway.app",
    String(prodApi),
  );
  record(
    "EAS production-apk API URL",
    apkApi === "https://api-production-a778.up.railway.app",
    String(apkApi),
  );
  record(
    "EAS production Android app-bundle",
    eas.build?.production?.android?.buildType === "app-bundle",
  );
  record(
    "Android package identity",
    appJson.expo?.android?.package === "com.eliteflow.mobile",
    appJson.expo?.android?.package,
  );
  record(
    "iOS bundle identity",
    appJson.expo?.ios?.bundleIdentifier === "com.eliteflow.mobile",
    appJson.expo?.ios?.bundleIdentifier,
  );
  record(
    "EAS project id present",
    Boolean(appJson.expo?.extra?.eas?.projectId),
    appJson.expo?.extra?.eas?.projectId,
  );
  record(
    "No Google test reCAPTCHA in eas.json",
    !JSON.stringify(eas).includes("6LeIxAcTAAAA"),
  );
  record(
    "ASC App Store id placeholder documented",
    String(eas.submit?.production?.ios?.ascAppId || "").includes("REPLACE"),
    "external blocker until real ASC id",
  );

  const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
  const banned = [
    "DATABASE_URL=",
    "SUPABASE_SERVICE_ROLE",
    "SERVICE_ROLE_KEY",
    "STRIPE_SECRET",
    "JWT_SECRET=",
    "sk_live_",
    "sk_test_",
  ];
  const leaked = banned.filter((k) => envExample.includes(k));
  record("Mobile .env.example secret hygiene", leaked.length === 0, leaked.join(",") || "ok");

  // Source scan (exclude docs that mention banned names intentionally)
  const srcRoot = path.join(root, "src");
  const offenders = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(ts|tsx|js|json)$/.test(ent.name)) {
        const text = fs.readFileSync(p, "utf8");
        for (const k of [
          "DATABASE_URL",
          "SUPABASE_SERVICE_ROLE",
          "STRIPE_SECRET_KEY",
          "sk_live_",
          "eyJhbGciOi", // JWT-ish service tokens
        ]) {
          if (text.includes(k)) offenders.push(`${path.relative(root, p)}:${k}`);
        }
      }
    }
  }
  walk(srcRoot);
  record("Mobile src secret scan", offenders.length === 0, offenders.slice(0, 5).join(" | ") || "ok");

  const apiError = fs.readFileSync(path.join(root, "src/api/api-error.ts"), "utf8");
  record(
    "Production rejects localhost API URL",
    apiError.includes("isDisallowedProductionApiUrl") &&
      apiError.includes("api-production-a778.up.railway.app"),
  );

  const recaptcha = fs.readFileSync(
    path.join(root, "src/features/security/recaptcha.ts"),
    "utf8",
  );
  record(
    "CAPTCHA honest (no fake success claim)",
    recaptcha.includes("does not embed a Google reCAPTCHA executor") ||
      recaptcha.includes("eliteflow-mobile:"),
  );

  const wb = fs.readFileSync(
    path.join(root, "src/features/whiteboards/WhiteboardDetailScreen.tsx"),
    "utf8",
  );
  record(
    "Whiteboard honest (no live collab claim)",
    wb.includes("Live collaborative editing is not available"),
  );

  const billing = fs.readFileSync(
    path.join(root, "src/features/billing/BillingScreen.tsx"),
    "utf8",
  );
  record(
    "Billing Stripe-gated copy present",
    billing.includes("paymentsEnabled") && billing.includes("stripeMode"),
  );

  // --- API production ---
  const health = await fetchStatus(`${API_URL}/api/v1/health`);
  record("API health", health.ok, `status=${health.status}`);

  const openapi = await fetchStatus(`${API_URL}/api/v1/public/openapi.json`);
  record("Public API OpenAPI published", openapi.ok, `status=${openapi.status}`);

  const publicClients = await fetchStatus(`${API_URL}/api/v1/public/clients`);
  record(
    "Public API clients gated without key",
    publicClients.status === 401 || publicClients.status === 403,
    `status=${publicClients.status}`,
  );

  const protectedPaths = [
    "/api/v1/auth/me",
    "/api/v1/auth/mfa/status",
    "/api/v1/clients/pipeline",
    "/api/v1/projects?page=1&limit=1",
    "/api/v1/tasks?page=1&limit=1",
    "/api/v1/invoices?page=1&limit=1",
    "/api/v1/billing/subscription",
    "/api/v1/billing/plans",
    "/api/v1/calendar/events?page=1&limit=1",
    "/api/v1/files?page=1&limit=1",
    "/api/v1/whiteboards?page=1&limit=1",
    "/api/v1/communication/conversations?page=1&limit=1",
    "/api/v1/notifications?page=1&limit=1",
  ];
  for (const p of protectedPaths) {
    const res = await fetchStatus(`${API_URL}${p}`);
    record(
      `Unauth gated ${p}`,
      res.status === 401 || res.status === 403,
      `status=${res.status}`,
    );
  }

  // --- Web production ---
  const webHome = await fetchStatus(WEB_URL);
  record("Web production reachable", webHome.ok, `status=${webHome.status}`);
  const webLogin = await fetchStatus(`${WEB_URL}/login`);
  record("Web login reachable", webLogin.ok, `status=${webLogin.status}`);

  for (const p of [
    "/portal",
    "/clients",
    "/projects",
    "/tasks",
    "/calendar",
    "/files",
    "/invoices",
    "/settings",
    "/integrations",
  ]) {
    const res = await fetchStatus(`${WEB_URL}${p}`, { redirect: "manual" });
    const gated =
      res.status === 307 ||
      res.status === 302 ||
      res.status === 401 ||
      res.status === 403;
    record(`Web route gated/auth ${p}`, gated, `status=${res.status}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    console.log("Failed:");
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
