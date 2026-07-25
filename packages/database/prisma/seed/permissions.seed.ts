import type { PrismaClient } from "../../../src/generated/client";

import { PERMISSIONS } from "./data/permissions.data";
import { seedLog } from "./utils/logger";

export async function seedPermissions(
  prisma: PrismaClient,
): Promise<Map<string, string>> {
  seedLog("Seeding permissions...");

  const permissionIdByKey = new Map<string, string>();

  for (const permission of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
      },
      create: {
        key: permission.key,
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
      },
    });

    permissionIdByKey.set(record.key, record.id);
  }

  seedLog(`  ✓ ${permissionIdByKey.size} permissions seeded`);
  return permissionIdByKey;
}
