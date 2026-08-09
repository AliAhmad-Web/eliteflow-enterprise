/**
 * Sync CLIENT role permissions to match ROLE_PERMISSION_MAP (production-safe).
 *
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/sync-client-role-permissions.ts
 */
import { prisma } from "@enterprise/database";

import { ROLE_PERMISSION_MAP } from "../../../packages/database/prisma/seed/data/role-permissions.data.js";

async function main() {
  const role = await prisma.role.findUnique({ where: { code: "CLIENT" } });
  if (!role) throw new Error("CLIENT role missing");

  const keys = ROLE_PERMISSION_MAP.CLIENT;
  const permissions = await prisma.permission.findMany({
    where: { key: { in: keys } },
    select: { id: true, key: true },
  });
  if (permissions.length !== keys.length) {
    const found = new Set(permissions.map((p) => p.key));
    const missing = keys.filter((k) => !found.has(k));
    throw new Error(`Missing permissions: ${missing.join(", ")}`);
  }

  const allowedIds = permissions.map((p) => p.id);
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }

  const removed = await prisma.rolePermission.deleteMany({
    where: {
      roleId: role.id,
      permissionId: { notIn: allowedIds },
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        role: "CLIENT",
        permissions: keys,
        removedCount: removed.count,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
