import {
  prisma,
  OAuthProvider,
  SessionRevokedReason,
  UserStatus,
} from "@enterprise/database";
import type { OtpPurpose } from "@enterprise/database";

import type { UserWithRoleAndPermissions } from "./auth.types.js";
import { DEFAULT_CLIENT_ROLE_CODE } from "./auth.constants.js";

const userWithRoleInclude = {
  role: {
    include: {
      rolePermissions: {
        include: {
          permission: {
            select: { key: true },
          },
        },
      },
    },
  },
} as const;

export class AuthRepository {
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async findUserByEmail(email: string): Promise<UserWithRoleAndPermissions | null> {
    return prisma.user.findFirst({
      where: {
        email: this.normalizeEmail(email),
        deletedAt: null,
      },
      include: userWithRoleInclude,
    });
  }

  async findUserById(userId: string): Promise<UserWithRoleAndPermissions | null> {
    return prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      include: userWithRoleInclude,
    });
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: { email: this.normalizeEmail(email), deletedAt: null },
      select: { id: true },
    });
    return user !== null;
  }

  async findRoleByCode(code: string) {
    return prisma.role.findUnique({
      where: { code },
    });
  }

  async createUser(input: {
    email: string;
    passwordHash?: string | null;
    firstName: string;
    lastName: string;
    roleId: string;
    status: UserStatus;
    emailVerified?: boolean;
    avatarUrl?: string | null;
  }) {
    return prisma.user.create({
      data: {
        email: this.normalizeEmail(input.email),
        passwordHash: input.passwordHash ?? null,
        firstName: input.firstName,
        lastName: input.lastName,
        roleId: input.roleId,
        status: input.status,
        emailVerified: input.emailVerified ?? false,
        emailVerifiedAt: input.emailVerified ? new Date() : null,
        avatarUrl: input.avatarUrl ?? null,
      },
      include: userWithRoleInclude,
    });
  }

  async markEmailVerifiedAndActive(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
      },
    });
  }

  async updateUserProfileFromOAuth(
    userId: string,
    input: { avatarUrl?: string | null },
  ): Promise<void> {
    if (!input.avatarUrl) {
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: input.avatarUrl,
      },
    });
  }

  async findOAuthAccount(
    provider: OAuthProvider,
    providerAccountId: string,
  ) {
    return prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        user: {
          include: userWithRoleInclude,
        },
      },
    });
  }

  async findOAuthAccountByUserAndProvider(
    userId: string,
    provider: OAuthProvider,
  ) {
    return prisma.oAuthAccount.findFirst({
      where: {
        userId,
        provider,
      },
    });
  }

  async countOAuthAccounts(userId: string): Promise<number> {
    return prisma.oAuthAccount.count({
      where: { userId },
    });
  }

  async createOAuthAccount(input: {
    userId: string;
    provider: OAuthProvider;
    providerAccountId: string;
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: Date | null;
  }) {
    return prisma.oAuthAccount.create({
      data: {
        userId: input.userId,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken ?? null,
        expiresAt: input.expiresAt ?? null,
      },
    });
  }

  /**
   * Ensures one OAuth provider link per user. Updates provider account id/tokens
   * when the same provider is linked again (e.g. stable sub vs identity id drift).
   */
  async upsertOAuthAccountForUser(input: {
    userId: string;
    provider: OAuthProvider;
    providerAccountId: string;
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: Date | null;
  }) {
    return prisma.oAuthAccount.upsert({
      where: {
        userId_provider: {
          userId: input.userId,
          provider: input.provider,
        },
      },
      create: {
        userId: input.userId,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken ?? null,
        expiresAt: input.expiresAt ?? null,
      },
      update: {
        providerAccountId: input.providerAccountId,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken ?? null,
        expiresAt: input.expiresAt ?? null,
      },
    });
  }

  async updateOAuthAccountTokens(
    id: string,
    input: {
      accessToken: string;
      refreshToken?: string | null;
      expiresAt?: Date | null;
      providerAccountId?: string;
    },
  ): Promise<void> {
    await prisma.oAuthAccount.update({
      where: { id },
      data: {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken ?? null,
        expiresAt: input.expiresAt ?? null,
        ...(input.providerAccountId
          ? { providerAccountId: input.providerAccountId }
          : {}),
      },
    });
  }

  async deleteOAuthAccount(id: string): Promise<void> {
    await prisma.oAuthAccount.delete({
      where: { id },
    });
  }

  async createSession(input: {
    userId: string;
    deviceName: string;
    ipAddress: string;
    userAgent: string;
  }) {
    return prisma.session.create({
      data: {
        userId: input.userId,
        deviceName: input.deviceName,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  async createRefreshToken(input: {
    tokenHash: string;
    sessionId: string;
    userId: string;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({
      data: input,
    });
  }

  async findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        session: true,
        user: {
          include: userWithRoleInclude,
        },
      },
    });
  }

  async revokeRefreshToken(
    tokenId: string,
    replacedByTokenId?: string,
  ): Promise<void> {
    await prisma.refreshToken.update({
      where: { id: tokenId },
      data: {
        revokedAt: new Date(),
        replacedByTokenId: replacedByTokenId ?? null,
      },
    });
  }

  async revokeSession(
    sessionId: string,
    reason: SessionRevokedReason,
  ): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  async revokeAllSessionTokens(sessionId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });
  }

  async recordSuccessfulLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  }

  async recordFailedLogin(
    userId: string,
    failedLoginCount: number,
    lockedUntil: Date | null,
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount,
        lockedUntil,
      },
    });
  }

  async clearAccountLock(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  }

  async countActiveSessions(userId: string): Promise<number> {
    return prisma.session.count({
      where: {
        userId,
        revokedAt: null,
      },
    });
  }

  async revokeOldestSession(userId: string): Promise<void> {
    const oldestSession = await prisma.session.findFirst({
      where: {
        userId,
        revokedAt: null,
      },
      orderBy: { lastActiveAt: "asc" },
    });

    if (!oldestSession) {
      return;
    }

    await this.revokeSession(oldestSession.id, SessionRevokedReason.SESSION_LIMIT);
    await this.revokeAllSessionTokens(oldestSession.id);
  }

  async rotateRefreshToken(input: {
    oldTokenId: string;
    newTokenHash: string;
    sessionId: string;
    userId: string;
    expiresAt: Date;
  }) {
    return prisma.$transaction(async (tx) => {
      const newToken = await tx.refreshToken.create({
        data: {
          tokenHash: input.newTokenHash,
          sessionId: input.sessionId,
          userId: input.userId,
          expiresAt: input.expiresAt,
        },
      });

      // Atomic claim — only one concurrent rotator wins.
      const claimed = await tx.refreshToken.updateMany({
        where: {
          id: input.oldTokenId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: newToken.id,
        },
      });

      if (claimed.count === 0) {
        await tx.refreshToken.delete({ where: { id: newToken.id } });
        return null;
      }

      return newToken;
    });
  }

  async getDefaultClientRole() {
    return prisma.role.findUnique({
      where: { code: DEFAULT_CLIENT_ROLE_CODE },
    });
  }

  async invalidatePasswordResetTokens(userId: string): Promise<void> {
    await prisma.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  async createPasswordResetToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.passwordResetToken.create({
      data: input,
    });
  }

  async findPasswordResetTokenByHash(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });
  }

  async markPasswordResetTokenUsed(tokenId: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  async invalidateEmailVerificationTokens(userId: string): Promise<void> {
    await prisma.emailVerificationToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  async createEmailVerificationToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.emailVerificationToken.create({
      data: input,
    });
  }

  async findEmailVerificationTokenByHash(tokenHash: string) {
    return prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: userWithRoleInclude,
        },
      },
    });
  }

  async markEmailVerificationTokenUsed(tokenId: string): Promise<void> {
    await prisma.emailVerificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  }

  async verifyUserEmail(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
      },
    });
  }

  async revokeAllUserSessions(
    userId: string,
    reason: SessionRevokedReason,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedReason: reason,
        },
      });

      await tx.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    });
  }

  async listActiveSessions(userId: string) {
    return prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      orderBy: [{ lastActiveAt: "desc" }, { createdAt: "desc" }],
    });
  }

  async findSessionForUser(sessionId: string, userId: string) {
    return prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });
  }

  async renameSession(
    sessionId: string,
    userId: string,
    deviceName: string,
  ) {
    return prisma.session.updateMany({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
      data: {
        deviceName,
      },
    });
  }

  async revokeOtherUserSessions(
    userId: string,
    currentSessionId: string,
    reason: SessionRevokedReason,
  ): Promise<number> {
    const others = await prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        id: { not: currentSessionId },
      },
      select: { id: true },
    });

    if (others.length === 0) {
      return 0;
    }

    const otherIds = others.map((session) => session.id);

    await prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: {
          id: { in: otherIds },
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedReason: reason,
        },
      });

      await tx.refreshToken.updateMany({
        where: {
          sessionId: { in: otherIds },
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    });

    return otherIds.length;
  }

  async cleanupIdleSessions(idleBefore: Date): Promise<number> {
    const idleSessions = await prisma.session.findMany({
      where: {
        revokedAt: null,
        lastActiveAt: { lt: idleBefore },
      },
      select: { id: true },
    });

    if (idleSessions.length === 0) {
      return 0;
    }

    const ids = idleSessions.map((session) => session.id);

    await prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { id: { in: ids }, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedReason: SessionRevokedReason.IDLE_TIMEOUT,
        },
      });

      await tx.refreshToken.updateMany({
        where: { sessionId: { in: ids }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return ids.length;
  }

  async deleteExpiredRefreshTokens(now = new Date()): Promise<number> {
    // Only hard-delete tokens past expiresAt so revoked-but-unexpired
    // hashes remain available for refresh-token reuse detection.
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    return result.count;
  }

  async deleteOldRevokedSessions(revokedBefore: Date): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        revokedAt: { not: null, lt: revokedBefore },
      },
    });

    return result.count;
  }

  async deleteOldAuditLogs(createdBefore: Date): Promise<number> {
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: createdBefore },
      },
    });

    return result.count;
  }

  async invalidateOtpVerifications(
    userId: string,
    purpose: OtpPurpose,
  ): Promise<void> {
    await prisma.otpVerification.updateMany({
      where: {
        userId,
        purpose,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  async createOtpVerification(input: {
    userId: string;
    codeHash: string;
    purpose: OtpPurpose;
    expiresAt: Date;
  }) {
    return prisma.otpVerification.create({
      data: input,
    });
  }

  async findOtpVerificationById(id: string) {
    return prisma.otpVerification.findUnique({
      where: { id },
      include: {
        user: {
          include: userWithRoleInclude,
        },
      },
    });
  }

  async findLatestOtpVerification(userId: string, purpose: OtpPurpose) {
    return prisma.otpVerification.findFirst({
      where: {
        userId,
        purpose,
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async incrementOtpAttempts(id: string, attempts: number): Promise<void> {
    await prisma.otpVerification.update({
      where: { id },
      data: { attempts },
    });
  }

  async markOtpVerificationUsed(id: string): Promise<void> {
    await prisma.otpVerification.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}

export const authRepository = new AuthRepository();
