import type { PrismaClient } from "../../../src/generated/client";

import { DEMO_USERS } from "./data/users.data";
import { hashPassword } from "./utils/hash-password";
import { seedLog } from "./utils/logger";

export async function seedUsers(
  prisma: PrismaClient,
  roleIdByCode: Map<string, string>,
  plainTextPassword: string,
): Promise<void> {
  seedLog("Seeding demo users...");

  const passwordHash = await hashPassword(plainTextPassword);

  for (const user of DEMO_USERS) {
    const roleId = roleIdByCode.get(user.roleCode);
    if (!roleId) {
      throw new Error(`Role not found for code: ${user.roleCode}`);
    }

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        roleId,
        status: user.status,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerified ? new Date() : null,
        passwordHash,
        twoFactorEnabled: user.twoFactorEnabled ?? false,
        deletedAt: null,
      },
      create: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId,
        status: user.status,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerified ? new Date() : null,
        passwordHash,
        twoFactorEnabled: user.twoFactorEnabled ?? false,
      },
    });

    seedLog(`  ✓ User: ${user.email} (${user.roleCode})`);
  }
}
