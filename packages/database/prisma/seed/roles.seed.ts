import type { PrismaClient } from "../../../src/generated/client";

import { ROLES } from "./data/roles.data";
import { seedLog } from "./utils/logger";

export async function seedRoles(prisma: PrismaClient): Promise<Map<string, string>> {
  seedLog("Seeding roles...");

  const roleIdByCode = new Map<string, string>();

  for (const role of ROLES) {
    const record = await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
      create: {
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
    });

    roleIdByCode.set(record.code, record.id);
    seedLog(`  ✓ Role: ${record.code}`);
  }

  return roleIdByCode;
}
