/**
 * Production CLIENT tasks MFA regression (no host CLI).
 * Mints DB session + opaque refresh, exchanges via public /auth/refresh
 * for a production-signed access token, then probes tasks.
 *
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-client-tasks-mfa-prod.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "@enterprise/database";

import {
  generateOpaqueRefreshToken,
  getRefreshTokenExpiresAt,
  hashRefreshToken,
} from "../src/modules/auth/auth.tokens.js";
import { sessionService } from "../src/modules/auth/session/index.js";
import {
  enforceMfaEnrollment,
  isMfaEnrollmentAllowedEndpoint,
} from "../src/shared/security/mfa-enrollment/index.js";
import { AuthError } from "../src/modules/auth/auth.errors.js";
import { AUTH_ERROR_CODES } from "@enterprise/shared";

const API = (
  process.env.VERIFY_API_URL?.trim() ||
  "https://api-production-a778.up.railway.app"
).replace(/\/$/, "");
const ORIGIN = "https://eliteflow-web.vercel.app";
const UA = `verify-client-tasks-mfa/${randomUUID().slice(0, 8)}`;

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
    deviceName: `client-tasks-mfa-${label}`,
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
    body: JSON.stringify({}),
  });
  const refreshJson = (await refreshRes.json()) as {
    success?: boolean;
    message?: string;
    data?: {
      accessToken?: string;
      tokens?: { accessToken?: string };
      user?: { role?: { code?: string }; email?: string };
    };
  };
  assert.equal(
    refreshRes.status,
    200,
    `refresh failed: ${refreshRes.status} ${refreshJson.message ?? ""}`,
  );
  const accessToken =
    refreshJson.data?.accessToken ?? refreshJson.data?.tokens?.accessToken;
  assert.ok(accessToken, "missing access token from refresh");
  return {
    accessToken,
    sessionId: session.sessionId,
    user: refreshJson.data?.user,
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
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, text };
}

async function revoke(sessionId: string) {
  await prisma.session
    .update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    })
    .catch(() => undefined);
}

async function main() {
  console.log(`API=${API}`);
  const ip = await clientIp();
  console.log(`ip=${ip}`);

  const health = await http("/api/v1/health", null);
  assert.equal(health.status, 200, "health");

  // Unit: CLIENT must never be gated
  await enforceMfaEnrollment({
    userId: "u-client",
    role: "CLIENT",
    twoFactorEnabled: false,
    method: "GET",
    path: "/tasks",
  });
  console.log("PASS unit: CLIENT MFA gate skip on /tasks");

  // Unit: ADMIN without MFA still blocked on /tasks
  await assert.rejects(
    () =>
      enforceMfaEnrollment({
        userId: "u-admin",
        role: "ADMIN",
        twoFactorEnabled: false,
        method: "GET",
        path: "/tasks",
      }),
    (err: unknown) =>
      err instanceof AuthError &&
      err.code === AUTH_ERROR_CODES.MFA_ENROLLMENT_REQUIRED,
  );
  console.log("PASS unit: ADMIN without MFA blocked on /tasks");
  assert.equal(isMfaEnrollmentAllowedEndpoint("GET", "/tasks"), false);

  const client = await prisma.user.findUnique({
    where: { email: "client@eliteflow.dev" },
    select: {
      id: true,
      email: true,
      companyId: true,
      twoFactorEnabled: true,
      role: { select: { code: true } },
    },
  });
  assert.ok(client, "seed client missing");
  assert.equal(client.role.code, "CLIENT");
  assert.ok(client.companyId, "seed client must be company-linked");
  console.log(
    `CLIENT account=${client.email} role=${client.role.code} companyId=${client.companyId}`,
  );

  const clientMint = await mintProdAccess(client.id, "client", ip);

  const me = await http("/api/v1/auth/me", clientMint.accessToken);
  assert.equal(me.status, 200, `CLIENT /me => ${me.status} ${JSON.stringify(me.json).slice(0, 300)}`);
  const meData = (me.json as { data?: Record<string, unknown> })?.data ?? {};
  const meRole =
    (meData as { role?: { code?: string } }).role?.code ??
    (meData as { user?: { role?: { code?: string } } }).user?.role?.code;
  assert.equal(meRole, "CLIENT", `me payload=${JSON.stringify(me.json).slice(0, 400)}`);
  console.log("PASS CLIENT /auth/me role=CLIENT");

  const tasks = await http(
    "/api/v1/tasks?page=1&limit=10&sortBy=createdAt&sortOrder=desc",
    clientMint.accessToken,
  );
  assert.equal(
    tasks.status,
    200,
    `CLIENT GET /tasks => ${tasks.status} ${JSON.stringify(tasks.json).slice(0, 240)}`,
  );
  const taskItems =
    (
      tasks.json as {
        data?: { items?: Array<{ id: string; project?: { clientId?: string } }> };
      }
    )?.data?.items ?? [];
  console.log(`PASS CLIENT GET /tasks 200 items=${taskItems.length}`);

  for (const item of taskItems) {
    if (item.project?.clientId) {
      assert.equal(
        item.project.clientId,
        client.companyId,
        "cross-company task leaked",
      );
    }
  }
  console.log("PASS CLIENT company isolation on list");

  const stats = await http("/api/v1/tasks/stats", clientMint.accessToken);
  assert.equal(stats.status, 200, `CLIENT /tasks/stats => ${stats.status}`);
  console.log("PASS CLIENT GET /tasks/stats 200");

  const projects = await http(
    "/api/v1/projects?page=1&limit=5&sortBy=createdAt&sortOrder=desc",
    clientMint.accessToken,
  );
  assert.equal(projects.status, 200, `CLIENT /projects => ${projects.status}`);

  const createDenied = await http("/api/v1/tasks", clientMint.accessToken, {
    method: "POST",
    body: JSON.stringify({
      title: "should-deny",
      status: "TODO",
      priority: "MEDIUM",
    }),
  });
  assert.ok(
    createDenied.status === 403 || createDenied.status === 400,
    `CLIENT create should be denied, got ${createDenied.status}`,
  );
  console.log(`PASS CLIENT create denied (${createDenied.status})`);

  const unauth = await http(
    "/api/v1/tasks?page=1&limit=1&sortBy=createdAt&sortOrder=desc",
    null,
  );
  assert.equal(unauth.status, 401);
  console.log("PASS unauthenticated /tasks 401");

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
  const adminTasks = await http(
    "/api/v1/tasks?page=1&limit=5&sortBy=createdAt&sortOrder=desc",
    adminMint.accessToken,
  );
  assert.equal(adminTasks.status, 403, "ADMIN without MFA must be blocked");
  const adminMsg = String(
    (adminTasks.json as { message?: string })?.message ?? "",
  );
  assert.match(
    adminMsg,
    /Multi-factor authentication enrollment is required/i,
  );
  console.log("PASS ADMIN without MFA blocked on /tasks");

  const superAdmin = await prisma.user.findUnique({
    where: { email: "superadmin@eliteflow.dev" },
    select: {
      id: true,
      twoFactorEnabled: true,
      role: { select: { code: true } },
    },
  });
  if (superAdmin && !superAdmin.twoFactorEnabled) {
    const saMint = await mintProdAccess(superAdmin.id, "sa", ip);
    const saTasks = await http(
      "/api/v1/tasks?page=1&limit=5&sortBy=createdAt&sortOrder=desc",
      saMint.accessToken,
    );
    assert.equal(saTasks.status, 403, "SUPER_ADMIN without MFA must be blocked");
    console.log("PASS SUPER_ADMIN without MFA blocked on /tasks");
    await revoke(saMint.sessionId);
  } else {
    console.log("SKIP SUPER_ADMIN MFA block (MFA already enabled or missing)");
  }

  await revoke(clientMint.sessionId);
  await revoke(adminMint.sessionId);
  console.log("\nALL CHECKS PASSED");
}

main()
  .catch((error) => {
    console.error("FAILED", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
