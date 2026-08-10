/**
 * LIVE production HTTP verification for Client Task Feedback.
 *
 * Mints short-lived sessions against the production DB, then exercises the
 * public API URL (not service-layer). Ephemeral fixture rows are cleaned up.
 *
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-client-task-feedback-live.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { ClientStatus, prisma, UserStatus } from "@enterprise/database";

import { authRepository } from "../src/modules/auth/auth.repository.js";
import { authService } from "../src/modules/auth/auth.service.js";
import {
  generateOpaqueRefreshToken,
  getRefreshTokenExpiresAt,
  hashRefreshToken,
} from "../src/modules/auth/auth.tokens.js";
import { sessionService } from "../src/modules/auth/session/index.js";
import { TASK_AUDIT_ACTIONS } from "../src/modules/tasks/tasks.audit.js";

const API =
  process.env.API_PUBLIC_URL ?? "https://api-production-a778.up.railway.app";
const ORIGIN = "https://eliteflow-web.vercel.app";
const RUN = randomUUID().slice(0, 8);
const PREFIX = `verify.live.fb.${RUN}`;
const MARKER = `LIVE-FB-${RUN}`;
const USER_AGENT = `verify-client-task-feedback-live/${RUN}`;

async function resolveClientIp(): Promise<string> {
  const fromEnv = process.env.VERIFY_CLIENT_IP?.trim();
  if (fromEnv) return fromEnv;
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const json = (await res.json()) as { ip?: string };
    if (json.ip) return json.ip;
  } catch {
    // fall through
  }
  return "127.0.0.1";
}

function email(local: string) {
  return `${PREFIX}.${local}@eliteflow.test`;
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true },
  });
  const clients = await prisma.client.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true },
  });
  const clientIds = clients.map((c) => c.id);
  const userIds = users.map((u) => u.id);

  if (clientIds.length) {
    await prisma.taskComment
      .deleteMany({
        where: { task: { project: { clientId: { in: clientIds } } } },
      })
      .catch(() => undefined);
    await prisma.taskActivityLog
      .deleteMany({
        where: { task: { project: { clientId: { in: clientIds } } } },
      })
      .catch(() => undefined);
    await prisma.task.deleteMany({
      where: { project: { clientId: { in: clientIds } } },
    });
    await prisma.project.deleteMany({ where: { clientId: { in: clientIds } } });
  }

  if (userIds.length) {
    await prisma.refreshToken
      .deleteMany({ where: { userId: { in: userIds } } })
      .catch(() => undefined);
    await prisma.session
      .deleteMany({ where: { userId: { in: userIds } } })
      .catch(() => undefined);
    await prisma.auditLog
      .deleteMany({ where: { userId: { in: userIds } } })
      .catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  if (clientIds.length) {
    await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
  }
}

async function mintAccess(userId: string, label: string, clientIp: string) {
  const session = await sessionService.createSession({
    userId,
    deviceName: `live-fb-${label}`,
    ipAddress: clientIp,
    userAgent: USER_AGENT,
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
  const refreshed = await authService.refresh(opaque, {
    ipAddress: clientIp,
    userAgent: USER_AGENT,
  });
  return {
    accessToken: refreshed.accessToken,
    sessionId: session.sessionId,
  };
}

async function httpJson(
  path: string,
  init: RequestInit & { token?: string | null } = {},
) {
  const headers = new Headers(init.headers);
  headers.set("Origin", ORIGIN);
  headers.set("Content-Type", "application/json");
  headers.set("User-Agent", USER_AGENT);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function main() {
  await cleanup();
  const clientIp = await resolveClientIp();

  const health = await httpJson("/api/v1/health");
  assert.equal(health.status, 200, "production health must be 200");

  const unauth = await httpJson(`/api/v1/tasks/${randomUUID()}/comments`, {
    method: "POST",
    body: JSON.stringify({ body: "unauthenticated probe" }),
    token: null,
  });
  assert.equal(unauth.status, 401, "unauthenticated comments must be 401");

  const clientRole = await prisma.role.findUnique({ where: { code: "CLIENT" } });
  const adminRole = await prisma.role.findUnique({ where: { code: "ADMIN" } });
  const employeeRole = await prisma.role.findUnique({
    where: { code: "EMPLOYEE" },
  });
  assert.ok(clientRole && adminRole && employeeRole);

  const companyA = await prisma.client.create({
    data: {
      companyName: `${PREFIX} Co A`,
      contactName: "Contact A",
      email: email("co-a"),
      status: ClientStatus.ACTIVE,
    },
  });
  const companyB = await prisma.client.create({
    data: {
      companyName: `${PREFIX} Co B`,
      contactName: "Contact B",
      email: email("co-b"),
      status: ClientStatus.ACTIVE,
    },
  });

  const userA = await authRepository.createUser({
    email: email("client-a"),
    passwordHash: null,
    firstName: "Client",
    lastName: "A",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  const userUnlinked = await authRepository.createUser({
    email: email("client-unlinked"),
    passwordHash: null,
    firstName: "Client",
    lastName: "Unlinked",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  const admin = await authRepository.createUser({
    email: email("admin"),
    passwordHash: null,
    firstName: "Admin",
    lastName: "User",
    roleId: adminRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  const employee = await authRepository.createUser({
    email: email("employee"),
    passwordHash: null,
    firstName: "Emp",
    lastName: "User",
    roleId: employeeRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });

  await prisma.user.update({
    where: { id: userA.id },
    data: { companyId: companyA.id },
  });

  const projectA = await prisma.project.create({
    data: {
      name: `${PREFIX} Project A`,
      clientId: companyA.id,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      progress: 10,
    },
  });
  const projectB = await prisma.project.create({
    data: {
      name: `${PREFIX} Project B`,
      clientId: companyB.id,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      progress: 10,
    },
  });
  const taskA = await prisma.task.create({
    data: {
      title: `${PREFIX} Task A`,
      projectId: projectA.id,
      status: "TODO",
      priority: "MEDIUM",
      assignedToId: employee.id,
    },
  });
  const taskB = await prisma.task.create({
    data: {
      title: `${PREFIX} Task B`,
      projectId: projectB.id,
      status: "TODO",
      priority: "MEDIUM",
    },
  });
  const taskUnassigned = await prisma.task.create({
    data: {
      title: `${PREFIX} Unassigned`,
      projectId: projectA.id,
      status: "TODO",
      priority: "LOW",
    },
  });

  const clientTok = await mintAccess(userA.id, "client", clientIp);
  const unlinkedTok = await mintAccess(userUnlinked.id, "unlinked", clientIp);
  const adminTok = await mintAccess(admin.id, "admin", clientIp);
  const empTok = await mintAccess(employee.id, "employee", clientIp);

  // CLIENT feedback on authorized task
  const feedbackBody = `${MARKER} please revise deliverable timeline`;
  const clientPost = await httpJson(`/api/v1/tasks/${taskA.id}/comments`, {
    method: "POST",
    token: clientTok.accessToken,
    body: JSON.stringify({
      body: feedbackBody,
      companyId: companyB.id,
      clientId: companyB.id,
    }),
  });
  assert.equal(
    clientPost.status,
    201,
    `CLIENT feedback expected 201, got ${clientPost.status}: ${JSON.stringify(clientPost.json)}`,
  );
  const created = clientPost.json as {
    success?: boolean;
    data?: { id?: string; body?: string };
  };
  assert.equal(created.success, true);
  assert.ok(created.data?.id);
  assert.equal(created.data?.body, feedbackBody);
  const commentId = created.data!.id!;

  // Persistence
  const persisted = await prisma.taskComment.findUnique({
    where: { id: commentId },
  });
  assert.ok(persisted);
  assert.equal(persisted.body, feedbackBody);
  assert.equal(persisted.authorId, userA.id);
  assert.equal(persisted.taskId, taskA.id);

  // Cross-company → 404
  const cross = await httpJson(`/api/v1/tasks/${taskB.id}/comments`, {
    method: "POST",
    token: clientTok.accessToken,
    body: JSON.stringify({ body: `${MARKER} cross-company` }),
  });
  assert.equal(cross.status, 404, `cross-company expected 404 got ${cross.status}`);

  // Unlinked CLIENT → 403
  const unlinked = await httpJson(`/api/v1/tasks/${taskA.id}/comments`, {
    method: "POST",
    token: unlinkedTok.accessToken,
    body: JSON.stringify({ body: `${MARKER} unlinked` }),
  });
  assert.equal(
    unlinked.status,
    403,
    `unlinked CLIENT expected 403 got ${unlinked.status}: ${JSON.stringify(unlinked.json)}`,
  );

  // ADMIN can comment
  const adminPost = await httpJson(`/api/v1/tasks/${taskA.id}/comments`, {
    method: "POST",
    token: adminTok.accessToken,
    body: JSON.stringify({ body: `${MARKER} admin ack` }),
  });
  assert.equal(
    adminPost.status,
    201,
    `ADMIN comment expected 201 got ${adminPost.status}`,
  );

  // EMPLOYEE on assigned task
  const empPost = await httpJson(`/api/v1/tasks/${taskA.id}/comments`, {
    method: "POST",
    token: empTok.accessToken,
    body: JSON.stringify({ body: `${MARKER} employee update` }),
  });
  assert.equal(
    empPost.status,
    201,
    `EMPLOYEE assigned comment expected 201 got ${empPost.status}`,
  );

  // EMPLOYEE on unassigned → 404
  const empDenied = await httpJson(
    `/api/v1/tasks/${taskUnassigned.id}/comments`,
    {
      method: "POST",
      token: empTok.accessToken,
      body: JSON.stringify({ body: `${MARKER} not mine` }),
    },
  );
  assert.equal(empDenied.status, 404);

  // Task create still staff-only for CLIENT
  const clientCreate = await httpJson(`/api/v1/tasks`, {
    method: "POST",
    token: clientTok.accessToken,
    body: JSON.stringify({
      title: `${PREFIX} should fail`,
      projectId: projectA.id,
      status: "TODO",
      priority: "MEDIUM",
    }),
  });
  assert.ok(
    clientCreate.status === 403 || clientCreate.status === 401,
    `CLIENT task create must be denied, got ${clientCreate.status}`,
  );

  // Audit
  const audits = await prisma.auditLog.findMany({
    where: {
      userId: userA.id,
      action: TASK_AUDIT_ACTIONS.COMMENT,
      resourceId: taskA.id,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  assert.ok(audits.length >= 1);
  const meta = audits[0]!.metadata as Record<string, unknown> | null;
  assert.equal(meta?.fromClient, true);
  assert.equal(meta?.companyId, companyA.id);
  assert.equal(meta?.role, "CLIENT");

  // Revoke sessions
  for (const sid of [
    clientTok.sessionId,
    unlinkedTok.sessionId,
    adminTok.sessionId,
    empTok.sessionId,
  ]) {
    await prisma.session
      .update({ where: { id: sid }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }

  console.log(
    JSON.stringify(
      {
        result: "PASS",
        api: API,
        clientIpBound: Boolean(clientIp),
        health: health.status,
        unauthenticated: unauth.status,
        clientFeedback: clientPost.status,
        persistedCommentId: commentId,
        crossCompany: cross.status,
        unlinkedClient: unlinked.status,
        adminComment: adminPost.status,
        employeeAssigned: empPost.status,
        employeeUnassigned: empDenied.status,
        clientCreateDenied: clientCreate.status,
        auditAction: TASK_AUDIT_ACTIONS.COMMENT,
        spoofIgnored: true,
        marker: MARKER,
      },
      null,
      2,
    ),
  );

  await cleanup();
}

main()
  .catch(async (err) => {
    console.error("FAILED", err instanceof Error ? err.message : err);
    await cleanup().catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
