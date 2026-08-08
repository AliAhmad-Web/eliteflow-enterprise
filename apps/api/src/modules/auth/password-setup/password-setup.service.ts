import { randomBytes } from "node:crypto";

import { prisma } from "@enterprise/database";
import { AUTH_ERROR_CODES, TOKEN_EXPIRATION } from "@enterprise/shared";

import { emailConfig } from "../../../config/email.config.js";
import { writeAuditLogSafe } from "../../../shared/security/write-audit-log.js";
import { AuthError } from "../auth.errors.js";
import { hashOpaqueToken } from "../auth.tokens.js";

import {
  PASSWORD_SETUP_AUDIT_ACTIONS,
  PASSWORD_SETUP_AUDIT_RESOURCE,
  PASSWORD_SETUP_GENERIC_ERROR,
} from "./password-setup.constants.js";
import type {
  ConsumedPasswordSetupToken,
  ConsumePasswordSetupTokenInput,
  CreatePasswordSetupTokenInput,
  PasswordSetupAuditContext,
  PasswordSetupPurpose,
  PasswordSetupTokenResult,
} from "./password-setup.types.js";

function defaultExpiresInMinutes(): number {
  return TOKEN_EXPIRATION.PASSWORD_SETUP_MINUTES;
}

function getExpiresAt(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function generateSecureToken(): string {
  return randomBytes(32).toString("base64url");
}

function buildSetupUrl(rawToken: string): string {
  return `${emailConfig.frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

function isMalformedToken(rawToken: string): boolean {
  if (!rawToken || typeof rawToken !== "string") return true;
  const trimmed = rawToken.trim();
  if (trimmed.length < 20 || trimmed.length > 256) return true;
  // base64url charset only — reject enumeration probes with odd shapes
  return !/^[A-Za-z0-9_-]+$/.test(trimmed);
}

async function writeSetupAudit(
  action: string,
  audit: PasswordSetupAuditContext | undefined,
  extra?: Record<string, unknown>,
): Promise<void> {
  const metadata: Record<string, unknown> = {
    ...(audit?.metadata ?? {}),
    ...(extra ?? {}),
  };
  // Defense in depth — never persist secrets even if a caller slips
  delete metadata.rawToken;
  delete metadata.token;
  delete metadata.setupUrl;
  delete metadata.passwordSetupUrl;
  delete metadata.resetUrl;
  delete metadata.tokenHash;

  await writeAuditLogSafe(
    {
      userId: audit?.userId ?? audit?.actorUserId ?? null,
      action,
      resource: PASSWORD_SETUP_AUDIT_RESOURCE,
      resourceId: typeof extra?.tokenId === "string" ? extra.tokenId : null,
      metadata,
      ipAddress: audit?.ipAddress ?? null,
      userAgent: audit?.userAgent ?? null,
    },
    "password-setup-audit",
  );
}

function throwGenericInvalid(): never {
  throw new AuthError(
    PASSWORD_SETUP_GENERIC_ERROR,
    400,
    AUTH_ERROR_CODES.RESET_TOKEN_INVALID,
  );
}

export class PasswordSetupService {
  /**
   * Issue a single-use setup / reset token.
   * Stores SHA-256 hash only; returns opaque token + URL to the caller once.
   */
  async createToken(
    input: CreatePasswordSetupTokenInput,
  ): Promise<PasswordSetupTokenResult> {
    const expiresInMinutes =
      input.expiresInMinutes ?? defaultExpiresInMinutes();
    const expiresAt = getExpiresAt(expiresInMinutes);
    const rawToken = generateSecureToken();
    const tokenHash = hashOpaqueToken(rawToken);

    await prisma.passwordResetToken.updateMany({
      where: {
        userId: input.userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const created = await prisma.passwordResetToken.create({
      data: {
        userId: input.userId,
        tokenHash,
        expiresAt,
      },
    });

    await writeSetupAudit(PASSWORD_SETUP_AUDIT_ACTIONS.CREATED, input.audit, {
      tokenId: created.id,
      purpose: input.purpose,
      expiresAt: expiresAt.toISOString(),
      expiresInMinutes,
      targetUserId: input.userId,
    });

    return {
      rawToken,
      tokenId: created.id,
      expiresAt,
      setupUrl: buildSetupUrl(rawToken),
      expiresInMinutes,
      purpose: input.purpose,
    };
  }

  /**
   * Validate and atomically consume a token.
   * All failure modes return the same generic AuthError; specific outcomes are audited.
   */
  async consumeToken(
    input: ConsumePasswordSetupTokenInput,
  ): Promise<ConsumedPasswordSetupToken> {
    const auditBase: PasswordSetupAuditContext = {
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
    };

    if (isMalformedToken(input.rawToken)) {
      await writeSetupAudit(PASSWORD_SETUP_AUDIT_ACTIONS.INVALID, auditBase, {
        reason: "malformed",
      });
      throwGenericInvalid();
    }

    const tokenHash = hashOpaqueToken(input.rawToken.trim());
    const stored = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            passwordHash: true,
            deletedAt: true,
            mustChangePassword: true,
          },
        },
      },
    });

    if (!stored) {
      await writeSetupAudit(PASSWORD_SETUP_AUDIT_ACTIONS.INVALID, auditBase, {
        reason: "not_found",
      });
      throwGenericInvalid();
    }

    if (stored.user.deletedAt) {
      await writeSetupAudit(
        PASSWORD_SETUP_AUDIT_ACTIONS.INVALID,
        { ...auditBase, userId: stored.userId },
        { tokenId: stored.id, reason: "user_unavailable" },
      );
      throwGenericInvalid();
    }

    if (stored.usedAt) {
      await writeSetupAudit(
        PASSWORD_SETUP_AUDIT_ACTIONS.REUSED_ATTEMPT,
        { ...auditBase, userId: stored.userId },
        { tokenId: stored.id },
      );
      throwGenericInvalid();
    }

    if (stored.expiresAt < new Date()) {
      await writeSetupAudit(
        PASSWORD_SETUP_AUDIT_ACTIONS.EXPIRED,
        { ...auditBase, userId: stored.userId },
        { tokenId: stored.id },
      );
      // Mark used so it cannot be probed again as "expired"
      await prisma.passwordResetToken.updateMany({
        where: { id: stored.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      throwGenericInvalid();
    }

    const consumed = await prisma.passwordResetToken.updateMany({
      where: {
        id: stored.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    if (consumed.count !== 1) {
      await writeSetupAudit(
        PASSWORD_SETUP_AUDIT_ACTIONS.REUSED_ATTEMPT,
        { ...auditBase, userId: stored.userId },
        { tokenId: stored.id, reason: "concurrent_consume" },
      );
      throwGenericInvalid();
    }

    return {
      tokenId: stored.id,
      userId: stored.userId,
      user: stored.user,
    };
  }

  async markCompleted(
    tokenId: string,
    userId: string,
    context: { ipAddress?: string | null; userAgent?: string | null },
    purpose?: PasswordSetupPurpose,
  ): Promise<void> {
    await writeSetupAudit(
      PASSWORD_SETUP_AUDIT_ACTIONS.COMPLETED,
      {
        userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      {
        tokenId,
        ...(purpose ? { purpose } : {}),
      },
    );
  }

  /** Invalidate all unused tokens for a user (e.g. before issuing a new one). */
  async invalidateUserTokens(userId: string): Promise<void> {
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

  /** Hard-delete expired used tokens older than retention window. */
  async cleanupExpiredTokens(retentionDays = 7): Promise<number> {
    const cutoff = new Date(
      Date.now() - Math.max(1, retentionDays) * 24 * 60 * 60 * 1000,
    );
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: cutoff }, usedAt: { not: null } },
          { expiresAt: { lt: cutoff }, usedAt: null },
        ],
      },
    });
    return result.count;
  }

  buildSetupUrl(rawToken: string): string {
    return buildSetupUrl(rawToken);
  }

  getDefaultExpiresInMinutes(): number {
    return defaultExpiresInMinutes();
  }
}

export const passwordSetupService = new PasswordSetupService();
