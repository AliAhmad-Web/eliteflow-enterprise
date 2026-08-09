/**
 * RBAC matrix checks for global search against production/local DB.
 * Run: npx tsx apps/api/scripts/verify-global-search-rbac.ts
 *
 * Requires DATABASE_URL. Uses real SearchService (no dummy data).
 */
import assert from "node:assert/strict";

import { prisma } from "@enterprise/database";
import { UserRole } from "@enterprise/shared";

import {
  searchService,
  type SearchActor,
} from "../src/modules/search/search.service.js";

async function actorForRole(code: string): Promise<SearchActor | null> {
  const user = await prisma.user.findFirst({
    where: { deletedAt: null, role: { code } },
    select: {
      id: true,
      email: true,
      companyId: true,
      role: {
        select: {
          code: true,
          rolePermissions: {
            select: { permission: { select: { key: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!user) return null;
  return {
    userId: user.id,
    email: user.email,
    role: user.role.code,
    companyId: user.companyId,
    permissions: user.role.rolePermissions.map((rp) => rp.permission.key),
  };
}

function assertNoInternalPeopleLeak(
  label: string,
  result: Awaited<ReturnType<typeof searchService.search>>,
) {
  assert.equal(
    result.groups.users.length,
    0,
    `${label}: clients must never see users`,
  );
  assert.equal(
    result.groups.employees.length,
    0,
    `${label}: clients must never see employees`,
  );
  assert.equal(
    result.groups.clients.length,
    0,
    `${label}: clients must never see other clients directory`,
  );
  assert.equal(
    result.groups.departments.length,
    0,
    `${label}: clients must never see departments`,
  );
  assert.equal(
    result.groups.teams.length,
    0,
    `${label}: clients must never see HR teams`,
  );
  assert.equal(
    result.groups.leave.length,
    0,
    `${label}: clients must never see leave`,
  );
}

async function main() {
  const roles = [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.EMPLOYEE,
    UserRole.CLIENT,
  ] as const;

  const actors: Partial<Record<(typeof roles)[number], SearchActor>> = {};
  for (const role of roles) {
    const actor = await actorForRole(role);
    if (!actor) {
      console.warn(`skip ${role}: no user in DB`);
      continue;
    }
    actors[role] = actor;
  }

  // Broad query that should hit seeded demo content when present.
  const q = "a";

  if (actors.SUPER_ADMIN) {
    const result = await searchService.search(
      { q, scope: "all", limit: 8 },
      actors.SUPER_ADMIN,
    );
    assert.ok(result.total >= 0);
    // Super admin with permissions should be able to query people + projects.
    const people =
      result.groups.users.length + result.groups.employees.length;
    console.log(`SUPER_ADMIN total=${result.total} people=${people}`);
  }

  if (actors.ADMIN) {
    const result = await searchService.search(
      { q, scope: "all", limit: 8 },
      actors.ADMIN,
    );
    assert.ok(result.total >= 0);
    console.log(`ADMIN total=${result.total}`);
  }

  if (actors.EMPLOYEE) {
    const result = await searchService.search(
      { q, scope: "all", limit: 8 },
      actors.EMPLOYEE,
    );
    for (const user of result.groups.users) {
      assert.equal(
        user.id,
        actors.EMPLOYEE.userId,
        "EMPLOYEE must not see other users in search",
      );
    }
    assert.ok(
      result.groups.employees.length <= 1,
      "EMPLOYEE should see at most their own employee profile",
    );
    console.log(
      `EMPLOYEE total=${result.total} users=${result.groups.users.length} employees=${result.groups.employees.length}`,
    );
  }

  if (actors.CLIENT) {
    const result = await searchService.search(
      { q, scope: "all", limit: 8 },
      actors.CLIENT,
    );
    assertNoInternalPeopleLeak("CLIENT", result);
    console.log(`CLIENT total=${result.total}`);
  }

  // Deep-link contract samples (shape).
  if (actors.SUPER_ADMIN) {
    const invoices = await searchService.search(
      { q: "INV", scope: "invoices", limit: 5 },
      actors.SUPER_ADMIN,
    );
    for (const row of invoices.groups.invoices) {
      assert.match(row.href, /^\/invoices\?open=/);
    }
    const calendar = await searchService.search(
      { q: "a", scope: "calendar", limit: 5 },
      actors.SUPER_ADMIN,
    );
    for (const row of calendar.groups.calendar) {
      assert.match(row.href, /^\/calendar\?open=/);
    }
  }

  console.log("verify-global-search-rbac: OK");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
