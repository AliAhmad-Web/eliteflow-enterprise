import { createHash } from "node:crypto";

import {
  prisma,
  SessionRevokedReason,
  UserStatus,
} from "@enterprise/database";
import { AUTH_ERROR_CODES, TOKEN_EXPIRATION } from "@enterprise/shared";

import { AuthError } from "../auth.errors.js";
import { writeAuditLogSafe } from "../../../shared/security/write-audit-log.js";
import { securityMonitoringService } from "../../../shared/security/monitoring/index.js";
import { getSessionHardeningPolicy } from "../../../shared/security/session-hardening/session-hardening.config.js";
import { sessionHardeningService } from "../../../shared/security/session-hardening/session-hardening.service.js";

import {
  SESSION_AUDIT_ACTIONS,
  SESSION_AUDIT_RESOURCE,
  SESSION_INVALID_MESSAGE,
} from "./session.constants.js";
import type {
  CreateSessionInput,
  CreateSessionResult,
  RevokeAllSessionsInput,
  RevokeSessionInput,
  ValidateSessionInput,
  ValidatedSession,
} from "./session.types.js";

function hashFingerprint(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return createHash("sha256").update(trimmed).digest("hex");
}

function absoluteExpiresAt(rememberMe: boolean): Date {
  const policy = getSessionHardeningPolicy();
  const days = rememberMe
    ? policy.absoluteTimeoutRememberMeDays
    : policy.absoluteTimeoutDays;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function idleCutoff(): Date {
  const policy = getSessionHardeningPolicy();
  return new Date(Date.now() - policy.idleTimeoutMinutes * 60 * 1000);
}

function throwInvalidSession(): never {
  throw new AuthError(
    SESSION_INVALID_MESSAGE,
    401,
    AUTH_ERROR_CODES.SESSION_INVALID,
  );
}

function majorFingerprintMismatch(input: {
  sessionIp: string;
  sessionUa: string;
  sessionFingerprint: string | null;
  requestIp?: string | null;
  requestUa?: string | null;
  requestFingerprint?: string | null;
}): boolean {
  const reqFp = hashFingerprint(input.requestFingerprint);
  if (input.sessionFingerprint && reqFp && input.sessionFingerprint !== reqFp) {
    return true;
  }

  // Major UA family change (browser token) — soft signal only
  if (input.requestUa && input.sessionUa) {
    const sessionToken = input.sessionUa.slice(0, 48).toLowerCase();
    const requestToken = input.requestUa.slice(0, 48).toLowerCase();
    if (
      sessionToken.length > 10 &&
      requestToken.length > 10 &&
      sessionToken !== requestToken &&
      !requestToken.includes(sessionToken.slice(0, 20)) &&
      !sessionToken.includes(requestToken.slice(0, 20))
    ) {
      return true;
    }
  }

  return false;
}

export class SessionService {
  getRefreshTokenExpiresAt(rememberMe = false): Date {
    const seconds = rememberMe
      ? TOKEN_EXPIRATION.REFRESH_TOKEN_SECONDS_REMEMBER_ME
      : TOKEN_EXPIRATION.REFRESH_TOKEN_SECONDS;
    return new Date(Date.now() + seconds * 1000);
  }

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    const rememberMe = Boolean(input.rememberMe);
    const expiresAt = absoluteExpiresAt(rememberMe);
    const fingerprintHash = hashFingerprint(input.deviceFingerprint);

    const activeCount = await prisma.session.count({
      where: { userId: input.userId, revokedAt: null },
    });

    if (activeCount >= getSessionHardeningPolicy().maxConcurrentSessions) {
      await this.revokeOldestSession(input.userId, {
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      void sessionHardeningService.reportSessionLimitExceeded({
        userId: input.userId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
    }

    const session = await prisma.session.create({
      data: {
        userId: input.userId,
        deviceName: input.deviceName,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        fingerprintHash,
        expiresAt,
      },
    });

    void writeAuditLogSafe(
      {
        userId: input.userId,
        action: SESSION_AUDIT_ACTIONS.CREATED,
        resource: SESSION_AUDIT_RESOURCE,
        resourceId: session.id,
        metadata: {
          rememberMe,
          expiresAt: expiresAt.toISOString(),
          deviceName: input.deviceName,
        },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
      "session-audit",
    );

    return {
      sessionId: session.id,
      expiresAt,
      rememberMe,
    };
  }

  /**
   * Full enterprise session validation — never trust JWT alone.
   * Runs before Zero Trust / RBAC.
   */
  async validateSession(
    input: ValidateSessionInput,
  ): Promise<ValidatedSession> {
    const session = await prisma.session.findFirst({
      where: { id: input.sessionId },
      include: {
        user: {
          select: {
            id: true,
            status: true,
            deletedAt: true,
            passwordChangedAt: true,
            twoFactorEnabled: true,
            lockedUntil: true,
            mustChangePassword: true,
            passwordHash: true,
            role: { select: { code: true } },
          },
        },
      },
    });

    if (!session || session.userId !== input.userId) {
      await this.auditFailure(SESSION_AUDIT_ACTIONS.REVOKED, input, {
        reason: "not_found_or_mismatch",
      });
      throwInvalidSession();
    }

    if (session.revokedAt) {
      await this.auditFailure(SESSION_AUDIT_ACTIONS.REVOKED, input, {
        reason: "already_revoked",
        revokedReason: session.revokedReason,
      });
      throwInvalidSession();
    }

    const user = session.user;
    if (
      !user ||
      user.deletedAt ||
      user.status === UserStatus.DEACTIVATED ||
      user.status === UserStatus.LOCKED ||
      (user.lockedUntil && user.lockedUntil > new Date())
    ) {
      await this.revokeSession({
        sessionId: session.id,
        reason: SessionRevokedReason.ACCOUNT_DISABLED,
        userId: input.userId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        auditAction: SESSION_AUDIT_ACTIONS.REVOKED,
        metadata: { reason: "user_inactive" },
      });
      throwInvalidSession();
    }

    // Password changed after this session was issued → force re-login
    if (
      user.passwordChangedAt &&
      user.passwordChangedAt.getTime() > session.createdAt.getTime()
    ) {
      await this.revokeSession({
        sessionId: session.id,
        reason: SessionRevokedReason.PASSWORD_CHANGE,
        userId: input.userId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        auditAction: SESSION_AUDIT_ACTIONS.PASSWORD_CHANGED,
      });
      throwInvalidSession();
    }

    // Absolute timeout (hardening policy)
    const policy = getSessionHardeningPolicy();
    const absoluteExpiry =
      session.expiresAt ??
      new Date(
        session.createdAt.getTime() +
          policy.absoluteTimeoutDays * 24 * 60 * 60 * 1000,
      );
    if (absoluteExpiry.getTime() <= Date.now()) {
      await this.revokeSession({
        sessionId: session.id,
        reason: SessionRevokedReason.ABSOLUTE_TIMEOUT,
        userId: input.userId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        auditAction: SESSION_AUDIT_ACTIONS.ABSOLUTE_TIMEOUT,
      });
      throwInvalidSession();
    }

    // Idle timeout
    if (session.lastActiveAt.getTime() < idleCutoff().getTime()) {
      await this.revokeSession({
        sessionId: session.id,
        reason: SessionRevokedReason.IDLE_TIMEOUT,
        userId: input.userId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        auditAction: SESSION_AUDIT_ACTIONS.IDLE_TIMEOUT,
      });
      throwInvalidSession();
    }

    // Fingerprint / UA mismatch → security event, do NOT instant logout
    if (
      majorFingerprintMismatch({
        sessionIp: session.ipAddress,
        sessionUa: session.userAgent,
        sessionFingerprint: session.fingerprintHash,
        requestIp: input.ipAddress,
        requestUa: input.userAgent,
        requestFingerprint: input.deviceFingerprint,
      })
    ) {
      void securityMonitoringService.reportSessionAnomaly({
        userId: input.userId,
        resource: "session",
        resourceId: session.id,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        message: "Session fingerprint / user-agent mismatch detected",
        metadata: {
          sessionIp: session.ipAddress,
          fingerprintPresent: Boolean(session.fingerprintHash),
        },
      });
    }

    if (input.touch !== false) {
      await this.touchSession(session.id, session.lastActiveAt);
    }

    return {
      sessionId: session.id,
      userId: session.userId,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      fingerprintHash: session.fingerprintHash,
      userStatus: user.status,
      twoFactorEnabled: user.twoFactorEnabled,
      passwordChangedAt: user.passwordChangedAt,
      mustChangePassword: user.mustChangePassword,
      passwordHash: user.passwordHash,
      lockedUntil: user.lockedUntil,
      roleCode: user.role?.code ?? null,
    };
  }

  async touchSession(
    sessionId: string,
    lastActiveAt?: Date,
  ): Promise<void> {
    const throttleMs =
      TOKEN_EXPIRATION.SESSION_ACTIVITY_TOUCH_SECONDS * 1000;
    if (lastActiveAt && Date.now() - lastActiveAt.getTime() < throttleMs) {
      return;
    }

    await prisma.session.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
        ...(lastActiveAt
          ? {
              lastActiveAt: {
                lte: new Date(Date.now() - throttleMs),
              },
            }
          : {}),
      },
      data: { lastActiveAt: new Date() },
    });
  }

  async revokeSession(input: RevokeSessionInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: {
          id: input.sessionId,
          revokedAt: null,
          ...(input.userId ? { userId: input.userId } : {}),
        },
        data: {
          revokedAt: new Date(),
          revokedReason: input.reason,
        },
      });
      await tx.refreshToken.updateMany({
        where: {
          sessionId: input.sessionId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    });

    await writeAuditLogSafe(
      {
        userId: input.actorUserId ?? input.userId ?? null,
        action: input.auditAction ?? SESSION_AUDIT_ACTIONS.REVOKED,
        resource: SESSION_AUDIT_RESOURCE,
        resourceId: input.sessionId,
        metadata: {
          reason: input.reason,
          ...(input.metadata ?? {}),
        },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
      "session-audit",
    );
  }

  async revokeAllSessions(input: RevokeAllSessionsInput): Promise<number> {
    const active = await prisma.session.findMany({
      where: {
        userId: input.userId,
        revokedAt: null,
        ...(input.exceptSessionId
          ? { id: { not: input.exceptSessionId } }
          : {}),
      },
      select: { id: true },
    });

    if (active.length === 0) {
      return 0;
    }

    const ids = active.map((s) => s.id);

    await prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { id: { in: ids }, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedReason: input.reason,
        },
      });
      await tx.refreshToken.updateMany({
        where: {
          sessionId: { in: ids },
          userId: input.userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    });

    await writeAuditLogSafe(
      {
        userId: input.actorUserId ?? input.userId,
        action: input.auditAction ?? SESSION_AUDIT_ACTIONS.REVOKED,
        resource: SESSION_AUDIT_RESOURCE,
        resourceId: input.userId,
        metadata: {
          reason: input.reason,
          revokedCount: ids.length,
          exceptSessionId: input.exceptSessionId ?? null,
          ...(input.metadata ?? {}),
        },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
      "session-audit",
    );

    return ids.length;
  }

  async revokeOldestSession(
    userId: string,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<void> {
    const oldest = await prisma.session.findFirst({
      where: { userId, revokedAt: null },
      orderBy: { lastActiveAt: "asc" },
    });
    if (!oldest) return;

    await this.revokeSession({
      sessionId: oldest.id,
      userId,
      reason: SessionRevokedReason.SESSION_LIMIT,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      auditAction: SESSION_AUDIT_ACTIONS.LIMIT_EXCEEDED,
    });
  }

  /**
   * After an in-session password change, rebind the current session so
   * passwordChangedAt > createdAt does not immediately invalidate it.
   * All other sessions must already be revoked by the caller.
   */
  async rebindSessionAfterCredentialChange(sessionId: string): Promise<void> {
    const now = new Date();
    await prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: {
        createdAt: now,
        lastActiveAt: now,
      },
    });
  }

  async cleanupExpiredSessions(): Promise<{
    idleSessions: number;
    absoluteSessions: number;
  }> {
    const now = new Date();
    const idleBefore = idleCutoff();

    const idle = await prisma.session.findMany({
      where: {
        revokedAt: null,
        lastActiveAt: { lt: idleBefore },
      },
      select: { id: true, userId: true },
    });

    const absolute = await prisma.session.findMany({
      where: {
        revokedAt: null,
        OR: [
          { expiresAt: { lte: now } },
          {
            expiresAt: null,
            createdAt: {
              lt: new Date(
                now.getTime() -
                  getSessionHardeningPolicy().absoluteTimeoutDays *
                    24 *
                    60 *
                    60 *
                    1000,
              ),
            },
          },
        ],
      },
      select: { id: true, userId: true },
    });

    for (const row of idle) {
      await this.revokeSession({
        sessionId: row.id,
        userId: row.userId,
        reason: SessionRevokedReason.IDLE_TIMEOUT,
        auditAction: SESSION_AUDIT_ACTIONS.IDLE_TIMEOUT,
      });
    }

    for (const row of absolute) {
      // Skip if already revoked as idle in this pass
      if (idle.some((i) => i.id === row.id)) continue;
      await this.revokeSession({
        sessionId: row.id,
        userId: row.userId,
        reason: SessionRevokedReason.ABSOLUTE_TIMEOUT,
        auditAction: SESSION_AUDIT_ACTIONS.ABSOLUTE_TIMEOUT,
      });
    }

    return {
      idleSessions: idle.length,
      absoluteSessions: absolute.filter(
        (a) => !idle.some((i) => i.id === a.id),
      ).length,
    };
  }

  private async auditFailure(
    action: string,
    input: ValidateSessionInput,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await writeAuditLogSafe(
      {
        userId: input.userId,
        action,
        resource: SESSION_AUDIT_RESOURCE,
        resourceId: input.sessionId,
        metadata,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
      "session-audit",
    );
  }
}

export const sessionService = new SessionService();
