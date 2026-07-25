import type { PrismaClient } from "../../../src/generated/client";

import { ALL_PERMISSION_KEYS } from "./data/permissions.data";
import { ROLE_PERMISSION_MAP } from "./data/role-permissions.data";
import { ROLE_CODES } from "./data/roles.data";
import { seedLog } from "./utils/logger";

export async function seedRolePermissions(
  prisma: PrismaClient,
  roleIdByCode: Map<string, string>,
  permissionIdByKey: Map<string, string>,
): Promise<void> {
  seedLog("Seeding role-permission assignments...");

  for (const [roleCode, permissionKeys] of Object.entries(ROLE_PERMISSION_MAP)) {
    const roleId = roleIdByCode.get(roleCode);
    if (!roleId) {
      throw new Error(`Role not found for code: ${roleCode}`);
    }

    const resolvedKeys =
      permissionKeys[0] === "*"
        ? ALL_PERMISSION_KEYS
        : [...permissionKeys];

    const allowedPermissionIds = new Set<string>();

    for (const permissionKey of resolvedKeys) {
      const permissionId = permissionIdByKey.get(permissionKey);
      if (!permissionId) {
        throw new Error(`Permission not found for key: ${permissionKey}`);
      }

      allowedPermissionIds.add(permissionId);

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId,
        },
      });
    }

    // Keep assignments in sync with ROLE_PERMISSION_MAP (removes revoked keys)
    await prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId: { notIn: [...allowedPermissionIds] },
      },
    });

    const label =
      roleCode === ROLE_CODES.SUPER_ADMIN
        ? `${resolvedKeys.length} (all)`
        : String(resolvedKeys.length);

    seedLog(`  ✓ ${roleCode}: ${label} permissions`);
  }
}
