import argon2 from "argon2";
import { prisma } from "@enterprise/database";
import { PASSWORD_RULES } from "@enterprise/shared";

import { SECURITY_ERROR_CODES, SecurityError } from "./security.errors.js";
import { SECURITY_MESSAGES } from "./security.constants.js";

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Enforces password history / reuse prevention.
 * Stores previous hashes and rejects reuse of the last N passwords.
 */
export class PasswordHistoryService {
  async assertNotReused(
    userId: string,
    newPassword: string,
    currentHash?: string | null,
  ): Promise<void> {
    const hashes: string[] = [];

    if (currentHash) {
      hashes.push(currentHash);
    }

    const history = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: PASSWORD_RULES.HISTORY_COUNT,
      select: { passwordHash: true },
    });

    for (const row of history) {
      hashes.push(row.passwordHash);
    }

    for (const hash of hashes) {
      const matches = await argon2.verify(hash, newPassword).catch(() => false);
      if (matches) {
        throw new SecurityError(
          SECURITY_MESSAGES.PASSWORD_REUSED,
          400,
          SECURITY_ERROR_CODES.PASSWORD_REUSED,
        );
      }
    }
  }

  async recordPasswordChange(
    userId: string,
    previousHash: string | null | undefined,
  ): Promise<void> {
    if (!previousHash) {
      return;
    }

    await prisma.passwordHistory.create({
      data: {
        userId,
        passwordHash: previousHash,
      },
    });

    const excess = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: PASSWORD_RULES.HISTORY_COUNT,
      select: { id: true },
    });

    if (excess.length > 0) {
      await prisma.passwordHistory.deleteMany({
        where: { id: { in: excess.map((row) => row.id) } },
      });
    }
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password).catch(() => false);
  }
}

export const passwordHistoryService = new PasswordHistoryService();
