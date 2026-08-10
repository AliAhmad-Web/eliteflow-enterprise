/**
 * Production-safe Client Portal MFA + RBAC regression (all portal APIs).
 *
 * Mints sessions via DB + cookie refresh (no captcha / no host CLI).
 *
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-client-portal-mfa-global-prod.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "@enterprise/database";
import { AUTH_ERROR_CODES } from "@enterprise/shared";

import {
  generateOpaqueRefreshToken,
  getRefreshTokenExpiresAt,
  hashRefreshToken,
} from "../src/modules/auth/auth.tokens.js";
import { sessionService } from "../src/modules/auth/session/index.js";
import { enforceMfaEnrollment } from "../src/shared/security/mfa-enrollment/index.js";
import { AuthError } from "../src/modules/auth/auth.errors.js";

const API = (
  process.env.VERIFY_API_URL?.trim() ||
  "https://api-production-a778.up.railway.app"
).replace(/\/$/, "");
const ORIGIN = "https://eliteflow-web.vercel.app";
const UA = `verify-portal-mfa-global/${randomUUID().slice(0, 8)}`;

type Json = Record<string, unknown> | null;

async function clientIp() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const json = (await res.json()) as { ip?: string };
    if (json.ip) return json.ip;
  } catch {
    // fall through
  }
  return "127.0.0.1";
}

async function mintProdAccess(userId: string, label: string, ip: string) {
  const session = await sessionService.createSession({
    userId,
    deviceName: `portal-mfa-${label}`,
    ipAddress: ip,
    userAgent: UA,
    rememberMe: true,
  });
  const opaque = generateOpaqueRefreshToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(opaque),
      userId,
      sessionId: session.sessionId,
      expiresAt: getRefreshTokenExpiresAt(true),
    },
  });

  const refreshRes = await fetch(`${API}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      "User-Agent": UA,
      Cookie: `__Secure-refresh-token=${opaque}`,
    },
    body: "{}",
  });
  const refreshJson = (await refreshRes.json()) as {
    success?: boolean;
    message?: string;
    data?: {
      accessToken?: string;
      user?: { role?: { code?: string }; email?: string; id?: string };
    };
  };
  assert.equal(
    refreshRes.status,
    200,
    `refresh failed: ${refreshRes.status} ${refreshJson.message ?? ""}`,
  );
  const accessToken = refreshJson.data?.accessToken;
  assert.ok(accessToken, "missing access token");
  return {
    accessToken,
    sessionId: session.sessionId,
    refreshUser: refreshJson.data?.user ?? null,
  };
}

async function http(
  path: string,
  token: string | null,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set("Origin", ORIGIN);
  headers.set("User-Agent", UA);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const text = await res.text();
  let json: Json = null;
  try {
    json = text ? (JSON.parse(text) as Json) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, text };
}

function messageOf(json: Json): string {
  if (!json || typeof json !== "object") return "";
  return String((json as { message?: string }).message ?? "");
}

function codeOf(json: Json): string {
  if (!json || typeof json !== "object") return "";
  return String((json as { code?: string }).code ?? "");
}

async function revoke(sessionId: string) {
  await prisma.session
    .update({ where: { id: sessionId }, data: { revokedAt: new Date() } })
    .catch(() => undefined);
}

async function assertNoMfa(label: string, status: number, json: Json) {
  assert.notEqual(
    codeOf(json),
    AUTH_ERROR_CODES.MFA_ENROLLMENT_REQUIRED,
    `${label} must not return MFA enrollment error`,
  );
  assert.doesNotMatch(
    messageOf(json),
    /multi-factor authentication enrollment/i,
    `${label} must not return MFA enrollment message (status=${status})`,
  );
}

async function main() {
  console.log(`API=${API}`);
  const ip = await clientIp();

  const health = await http("/api/v1/health", null);
  assert.equal(health.status, 200);

  await enforceMfaEnrollment({
    userId: "00000000-0000-4000-8000-000000000001",
    role: "CLIENT",
    twoFactorEnabled: false,
    method: "GET",
    path: "/projects",
  });
  console.log("PASS unit: CLIENT skips MFA on /projects");

  await assert.rejects(
    () =>
      enforceMfaEnrollment({
        userId: "00000000-0000-4000-8000-000000000002",
        role: "ADMIN",
        twoFactorEnabled: false,
        method: "GET",
        path: "/projects",
      }),
    (err: unknown) =>
      err instanceof AuthError &&
      err.code === AUTH_ERROR_CODES.MFA_ENROLLMENT_REQUIRED,
  );
  console.log("PASS unit: ADMIN MFA still blocks /projects");

  const client = await prisma.user.findUnique({
    where: { email: "client@eliteflow.dev" },
    select: {
      id: true,
      email: true,
      companyId: true,
      role: { select: { code: true } },
    },
  });
  assert.ok(client);
  assert.equal(client.role.code, "CLIENT");
  assert.ok(client.companyId);
  console.log(`CLIENT=${client.email} companyId=${client.companyId}`);

  const mint = await mintProdAccess(client.id, "client", ip);
  if (mint.refreshUser?.role?.code) {
    assert.equal(mint.refreshUser.role.code, "CLIENT");
    console.log("PASS refresh returns authoritative CLIENT user");
  } else {
    console.log(
      "WARN refresh payload has no user yet (pre-deploy API) — continuing with /auth/me",
    );
  }

  const me = await http("/api/v1/auth/me", mint.accessToken);
  assert.equal(me.status, 200);
  await assertNoMfa("/auth/me", me.status, me.json);
  const meUser =
    ((me.json as { data?: { user?: { role?: { code?: string }; companyId?: string } } })
      ?.data?.user ??
      (me.json as { data?: { role?: { code?: string }; companyId?: string } })
        ?.data) ??
    null;
  assert.equal(meUser?.role?.code, "CLIENT");
  console.log("PASS /auth/me role=CLIENT");

  const portalGets: Array<{ label: string; path: string; ok: number[] }> = [
    {
      label: "projects.list",
      path: "/api/v1/projects?page=1&limit=10&sortBy=createdAt&sortOrder=desc",
      ok: [200],
    },
    { label: "projects.stats", path: "/api/v1/projects/stats", ok: [200] },
    {
      label: "tasks.list",
      path: "/api/v1/tasks?page=1&limit=10&sortBy=createdAt&sortOrder=desc",
      ok: [200],
    },
    { label: "tasks.stats", path: "/api/v1/tasks/stats", ok: [200] },
    {
      label: "invoices.list",
      path: "/api/v1/invoices?page=1&limit=10&sortBy=createdAt&sortOrder=desc",
      ok: [200],
    },
    { label: "invoices.stats", path: "/api/v1/invoices/stats", ok: [200] },
    {
      label: "files.list",
      path: "/api/v1/files?page=1&limit=20",
      ok: [200],
    },
    {
      label: "files.folders",
      path: "/api/v1/files/folders",
      ok: [200],
    },
    {
      label: "communication.conversations",
      path: "/api/v1/communication/conversations?page=1&limit=20",
      ok: [200],
    },
    {
      label: "calendar.events",
      path: "/api/v1/calendar/events",
      ok: [200],
    },
    {
      label: "calendar.upcoming",
      path: "/api/v1/calendar/upcoming",
      ok: [200],
    },
    {
      label: "notifications.list",
      path: "/api/v1/notifications?page=1&limit=20",
      ok: [200],
    },
    {
      label: "notifications.unread",
      path: "/api/v1/notifications/unread-count",
      ok: [200],
    },
    {
      label: "settings.overview",
      path: "/api/v1/settings/overview",
      ok: [200],
    },
  ];

  let firstTaskId: string | null = null;
  let firstProjectId: string | null = null;
  let firstInvoiceId: string | null = null;

  for (const endpoint of portalGets) {
    const res = await http(endpoint.path, mint.accessToken);
    await assertNoMfa(endpoint.label, res.status, res.json);
    assert.ok(
      endpoint.ok.includes(res.status),
      `${endpoint.label} expected ${endpoint.ok.join("|")} got ${res.status} ${messageOf(res.json)}`,
    );
    console.log(`PASS CLIENT ${endpoint.label} => ${res.status}`);

    if (endpoint.label === "tasks.list") {
      const items =
        (
          res.json as {
            data?: { items?: Array<{ id: string }> };
          }
        )?.data?.items ?? [];
      firstTaskId = items[0]?.id ?? null;
    }
    if (endpoint.label === "projects.list") {
      const items =
        (
          res.json as {
            data?: { items?: Array<{ id: string; clientId?: string }> };
          }
        )?.data?.items ?? [];
      firstProjectId = items[0]?.id ?? null;
      for (const item of items) {
        if (item.clientId) {
          assert.equal(item.clientId, client.companyId);
        }
      }
    }
    if (endpoint.label === "invoices.list") {
      const items =
        (
          res.json as {
            data?: { items?: Array<{ id: string; clientId?: string }> };
          }
        )?.data?.items ?? [];
      firstInvoiceId = items[0]?.id ?? null;
      for (const item of items) {
        if (item.clientId) {
          assert.equal(item.clientId, client.companyId);
        }
      }
    }
  }

  if (firstTaskId) {
    const detail = await http(`/api/v1/tasks/${firstTaskId}`, mint.accessToken);
    await assertNoMfa("tasks.detail", detail.status, detail.json);
    assert.equal(detail.status, 200);
    const activity = await http(
      `/api/v1/tasks/${firstTaskId}/activity`,
      mint.accessToken,
    );
    await assertNoMfa("tasks.activity", activity.status, activity.json);
    assert.ok([200].includes(activity.status));
    const feedback = await http(
      `/api/v1/tasks/${firstTaskId}/comments`,
      mint.accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          body: `portal-mfa-global-feedback ${randomUUID().slice(0, 8)}`,
        }),
      },
    );
    await assertNoMfa("tasks.feedback", feedback.status, feedback.json);
    assert.ok(
      [200, 201].includes(feedback.status),
      `feedback got ${feedback.status} ${messageOf(feedback.json)}`,
    );
    console.log("PASS CLIENT task detail/activity/feedback");
  } else {
    console.log("SKIP task detail (no tasks)");
  }

  if (firstProjectId) {
    const detail = await http(
      `/api/v1/projects/${firstProjectId}`,
      mint.accessToken,
    );
    await assertNoMfa("projects.detail", detail.status, detail.json);
    assert.equal(detail.status, 200);
    console.log("PASS CLIENT project detail");
  }

  if (firstInvoiceId) {
    const detail = await http(
      `/api/v1/invoices/${firstInvoiceId}`,
      mint.accessToken,
    );
    await assertNoMfa("invoices.detail", detail.status, detail.json);
    assert.equal(detail.status, 200);
    console.log("PASS CLIENT invoice detail");
  }

  const createTask = await http("/api/v1/tasks", mint.accessToken, {
    method: "POST",
    body: JSON.stringify({
      title: "portal-mfa-deny",
      status: "TODO",
      priority: "MEDIUM",
    }),
  });
  await assertNoMfa("tasks.create", createTask.status, createTask.json);
  assert.ok([403, 400].includes(createTask.status));
  console.log(`PASS CLIENT create task denied (${createTask.status})`);

  const foreignTask = await prisma.task.findFirst({
    where: {
      project: { clientId: { not: client.companyId! } },
      deletedAt: null,
    },
    select: { id: true },
  });
  if (foreignTask) {
    const cross = await http(`/api/v1/tasks/${foreignTask.id}`, mint.accessToken);
    await assertNoMfa("tasks.cross", cross.status, cross.json);
    assert.equal(cross.status, 404);
    console.log("PASS CLIENT cross-company task 404");
  } else {
    console.log("SKIP cross-company task (no foreign task)");
  }

  const unauth = await http(
    "/api/v1/tasks?page=1&limit=1&sortBy=createdAt&sortOrder=desc",
    null,
  );
  assert.equal(unauth.status, 401);
  console.log("PASS unauthenticated tasks 401");

  const admin = await prisma.user.findUnique({
    where: { email: "admin@eliteflow.dev" },
    select: {
      id: true,
      twoFactorEnabled: true,
      role: { select: { code: true } },
    },
  });
  assert.ok(admin);
  assert.equal(admin.role.code, "ADMIN");
  assert.equal(admin.twoFactorEnabled, false);
  const adminMint = await mintProdAccess(admin.id, "admin", ip);
  for (const path of [
    "/api/v1/tasks?page=1&limit=5&sortBy=createdAt&sortOrder=desc",
    "/api/v1/projects?page=1&limit=5&sortBy=createdAt&sortOrder=desc",
    "/api/v1/notifications/unread-count",
  ]) {
    const res = await http(path, adminMint.accessToken);
    assert.equal(res.status, 403, `ADMIN MFA block for ${path}`);
    assert.equal(codeOf(res.json), AUTH_ERROR_CODES.MFA_ENROLLMENT_REQUIRED);
  }
  console.log("PASS ADMIN without MFA still blocked on portal APIs");

  const sa = await prisma.user.findUnique({
    where: { email: "superadmin@eliteflow.dev" },
    select: {
      id: true,
      twoFactorEnabled: true,
      role: { select: { code: true } },
    },
  });
  if (sa && !sa.twoFactorEnabled) {
    const saMint = await mintProdAccess(sa.id, "sa", ip);
    const res = await http(
      "/api/v1/tasks?page=1&limit=5&sortBy=createdAt&sortOrder=desc",
      saMint.accessToken,
    );
    assert.equal(res.status, 403);
    // Password-change gate can fire before MFA when mustChangePassword is set.
    assert.ok(
      [
        AUTH_ERROR_CODES.MFA_ENROLLMENT_REQUIRED,
        "AUTH_PASSWORD_CHANGE_REQUIRED",
      ].includes(codeOf(res.json)),
      `SUPER_ADMIN privileged block code=${codeOf(res.json)}`,
    );
    console.log(
      `PASS SUPER_ADMIN privileged APIs blocked (${codeOf(res.json)})`,
    );
    await revoke(saMint.sessionId);
  }

  await revoke(mint.sessionId);
  await revoke(adminMint.sessionId);
  console.log("\nALL PORTAL MFA GLOBAL CHECKS PASSED");
}

main()
  .catch((error) => {
    console.error("FAILED", error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
