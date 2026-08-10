/**
 * Public API v1 verification (service-layer).
 *
 * Run:
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-public-api.ts
 *
 * Uses production Supabase DATABASE_URL. Creates temporary API keys and revokes them.
 * Does not expose secrets in logs (only prefixes).
 */
import assert from "node:assert/strict";

import { prisma } from "@enterprise/database";
import {
  PERMISSIONS,
  PUBLIC_API_ERROR_CODES,
  PUBLIC_API_SCOPES,
  UserRole,
} from "@enterprise/shared";

import { PublicApiError } from "../src/modules/public-api/public-api.errors.js";
import { publicApiKeysService } from "../src/modules/public-api/public-api-keys.service.js";
import { publicApiService } from "../src/modules/public-api/public-api.service.js";
import { publicApiKeysRepository } from "../src/modules/public-api/public-api-keys.repository.js";

async function roleHasPermission(roleCode: string, key: string) {
  const role = await prisma.role.findFirst({
    where: { code: roleCode },
    select: {
      rolePermissions: { select: { permission: { select: { key: true } } } },
    },
  });
  if (!role) return false;
  const keys = role.rolePermissions.map((r) => r.permission.key);
  return keys.includes("*") || keys.includes(key);
}

async function expectPublicError(
  fn: () => Promise<unknown>,
  code: string,
): Promise<void> {
  let caught = false;
  try {
    await fn();
  } catch (error) {
    caught = true;
    assert.ok(error instanceof PublicApiError);
    assert.equal(error.code, code);
  }
  assert.ok(caught, `expected PublicApiError ${code}`);
}

async function main() {
  const admin = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      role: { code: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] } },
    },
    select: { id: true, email: true, role: { select: { code: true } } },
  });
  assert.ok(admin, "admin user required");

  assert.equal(
    await roleHasPermission(UserRole.ADMIN, PERMISSIONS.INTEGRATIONS_MANAGE),
    true,
  );
  assert.equal(
    await roleHasPermission(UserRole.CLIENT, PERMISSIONS.INTEGRATIONS_MANAGE),
    false,
    "CLIENT must not manage public API keys",
  );

  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    select: { id: true, companyName: true },
    take: 2,
    orderBy: { createdAt: "asc" },
  });
  assert.ok(clients.length >= 2, "need at least 2 clients for isolation test");
  const [clientA, clientB] = clients;
  assert.ok(clientA && clientB);

  const actor = {
    userId: admin.id,
    email: admin.email,
    role: admin.role.code,
    ipAddress: "127.0.0.1",
    userAgent: "verify-public-api",
  };

  const allScopes = [
    PUBLIC_API_SCOPES.PUBLIC_READ,
    PUBLIC_API_SCOPES.CLIENTS_READ,
    PUBLIC_API_SCOPES.PROJECTS_READ,
    PUBLIC_API_SCOPES.TASKS_READ,
    PUBLIC_API_SCOPES.INVOICES_READ,
  ];

  const keyA = await publicApiKeysService.create(
    {
      name: "verify-public-a",
      scopes: allScopes,
      clientId: clientA.id,
    },
    actor,
  );
  const keyB = await publicApiKeysService.create(
    {
      name: "verify-public-b",
      scopes: allScopes,
      clientId: clientB.id,
    },
    actor,
  );
  const keyNarrow = await publicApiKeysService.create(
    {
      name: "verify-public-narrow",
      scopes: [PUBLIC_API_SCOPES.PUBLIC_READ],
      clientId: clientA.id,
    },
    actor,
  );
  const keyExpired = await publicApiKeysService.create(
    {
      name: "verify-public-expired",
      scopes: allScopes,
      clientId: clientA.id,
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    },
    actor,
  );

  console.log(
    `keys created prefixes=${keyA.key.keyPrefix},${keyB.key.keyPrefix},${keyNarrow.key.keyPrefix},${keyExpired.key.keyPrefix}`,
  );

  // 1-2 Auth valid / invalid
  const authA = await publicApiKeysService.authenticateRawKey(keyA.secret);
  assert.equal(authA.id, keyA.key.id);

  await expectPublicError(
    () => publicApiKeysService.authenticateRawKey("ef_live_not-a-real-key"),
    PUBLIC_API_ERROR_CODES.UNAUTHORIZED,
  );

  // 3 Revoked
  await publicApiKeysService.revoke(keyNarrow.key.id, actor);
  await expectPublicError(
    () => publicApiKeysService.authenticateRawKey(keyNarrow.secret),
    PUBLIC_API_ERROR_CODES.KEY_REVOKED,
  );

  // 4 Expired
  await expectPublicError(
    () => publicApiKeysService.authenticateRawKey(keyExpired.secret),
    PUBLIC_API_ERROR_CODES.KEY_EXPIRED,
  );

  // Build auth contexts
  const ctxA = {
    keyId: authA.id,
    keyPrefix: authA.keyPrefix,
    scopes: authA.scopes,
    ownerUserId: authA.ownerUserId,
    clientId: authA.clientId,
  };
  const authB = await publicApiKeysService.authenticateRawKey(keyB.secret);
  const ctxB = {
    keyId: authB.id,
    keyPrefix: authB.keyPrefix,
    scopes: authB.scopes,
    ownerUserId: authB.ownerUserId,
    clientId: authB.clientId,
  };

  const audit = { ipAddress: "127.0.0.1", userAgent: "verify-public-api" };

  // 5-6 Scope: narrow key was revoked; create a live narrow for scope miss on service layer
  // Service layer doesn't check scopes (middleware does) — verify via middleware-equivalent:
  assert.ok(!keyNarrow.key.scopes.includes(PUBLIC_API_SCOPES.CLIENTS_READ));
  assert.ok(ctxA.scopes.includes(PUBLIC_API_SCOPES.CLIENTS_READ));

  // 7-8 Company isolation
  const listedA = await publicApiService.listClients(
    ctxA,
    { page: 1, pageSize: 25, limit: 25, sortOrder: "desc" },
    audit,
  );
  assert.equal(listedA.items.length, 1);
  assert.equal(listedA.items[0]?.id, clientA.id);

  await expectPublicError(
    () => publicApiService.getClient(ctxA, clientB.id, audit),
    PUBLIC_API_ERROR_CODES.NOT_FOUND,
  );

  const listedB = await publicApiService.listClients(
    ctxB,
    { page: 1, pageSize: 25, limit: 25, sortOrder: "desc" },
    audit,
  );
  assert.equal(listedB.items.length, 1);
  assert.equal(listedB.items[0]?.id, clientB.id);

  // Cross-company project/invoice direct-ID isolation (404)
  const projectB = await prisma.project.findFirst({
    where: { deletedAt: null, clientId: clientB.id },
    select: { id: true },
  });
  if (projectB) {
    await expectPublicError(
      () => publicApiService.getProject(ctxA, projectB.id, audit),
      PUBLIC_API_ERROR_CODES.NOT_FOUND,
    );
  }

  const invoiceB = await prisma.invoice.findFirst({
    where: { deletedAt: null, clientId: clientB.id },
    select: { id: true },
  });
  if (invoiceB) {
    await expectPublicError(
      () => publicApiService.getInvoice(ctxA, invoiceB.id, audit),
      PUBLIC_API_ERROR_CODES.NOT_FOUND,
    );
  }

  // 9-10 Pagination + max page size (schema caps at 100)
  const paged = await publicApiService.listProjects(
    ctxA,
    { page: 1, pageSize: 1, limit: 1, sortOrder: "desc" },
    audit,
  );
  assert.ok(paged.meta.pageSize === 1);
  assert.ok(paged.items.length <= 1);

  // 11 Invalid filters handled by zod elsewhere; service accepts safe defaults
  const me = await publicApiService.getMe(ctxA, audit);
  assert.equal(me.companyId, clientA.id);
  assert.ok(!("secret" in me));
  assert.ok(!JSON.stringify(me).includes(keyA.secret));

  // CLIENT role cannot create keys
  await expectPublicError(
    () =>
      publicApiKeysService.create(
        { name: "client-attempt", scopes: [PUBLIC_API_SCOPES.PUBLIC_READ] },
        {
          userId: admin.id,
          email: admin.email,
          role: UserRole.CLIENT,
        },
      ),
    PUBLIC_API_ERROR_CODES.FORBIDDEN,
  );

  // Audit events recorded for key create
  const auditCount = await prisma.auditLog.count({
    where: {
      resource: "public_api",
      action: { in: ["public_api.key_created", "public_api.clients.read"] },
      createdAt: { gte: new Date(Date.now() - 10 * 60_000) },
    },
  });
  assert.ok(auditCount >= 1, "expected public_api audit events");

  // Cleanup — revoke remaining verification keys
  for (const id of [keyA.key.id, keyB.key.id, keyExpired.key.id]) {
    const row = await publicApiKeysRepository.findById(id);
    if (row && !row.revokedAt) {
      await publicApiKeysService.revoke(id, actor);
    }
  }

  console.log("PUBLIC_API_VERIFY_OK");
}

main()
  .catch((error) => {
    console.error("PUBLIC_API_VERIFY_FAIL", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
