/**
 * Upsert Phase 3 quote permissions and sync role links.
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/sync-quote-permissions.ts
 */
import { prisma } from "@enterprise/database";

import { PERMISSIONS } from "../../../packages/database/prisma/seed/data/permissions.data.js";
import { ROLE_PERMISSION_MAP } from "../../../packages/database/prisma/seed/data/role-permissions.data.js";

const KEYS = [
  "quotes:read",
  "quotes:write",
  "quotes:send",
  "quotes:approve",
] as const;

async function main() {
  for (const def of PERMISSIONS.filter((p) =>
    (KEYS as readonly string[]).includes(p.key),
  )) {
    await prisma.permission.upsert({
      where: { key: def.key },
      update: {
        resource: def.resource,
        action: def.action,
        description: def.description,
      },
      create: {
        key: def.key,
        resource: def.resource,
        action: def.action,
        description: def.description,
      },
    });
    console.log("upserted", def.key);
  }

  for (const code of ["SUPER_ADMIN", "ADMIN", "EMPLOYEE", "CLIENT"] as const) {
    const role = await prisma.role.findUnique({ where: { code } });
    if (!role) continue;
    const mapped = ROLE_PERMISSION_MAP[code];
    const wanted =
      mapped[0] === "*"
        ? KEYS
        : mapped.filter((k) => (KEYS as readonly string[]).includes(k));
    const perms = await prisma.permission.findMany({
      where: { key: { in: [...wanted] } },
    });
    for (const p of perms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: p.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: p.id },
      });
    }
    console.log("synced role", code, "quote perms", perms.length);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
