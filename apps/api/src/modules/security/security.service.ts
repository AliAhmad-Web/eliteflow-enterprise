import { randomUUID } from "node:crypto";

import { SessionRevokedReason } from "@enterprise/database";
import {
  PASSWORD_RULES,
  PERMISSIONS,
  UserRole,
  type ActiveDeviceListResponse,
  type ChangePasswordInput,
  type ChangePasswordSecurityResponse,
  type ContactFormInput,
  type ContactFormResponse,
  type ListActiveSessionsQueryInput,
  type ListLoginHistoryQueryInput,
  type ListSecurityEventsQueryInput,
  type ListSecurityLogsQueryInput,
  type LoginHistoryListResponse,
  type PasswordHistoryListResponse,
  type PasswordStatusDto,
  type SecurityAuditLogListResponse,
  type SecurityDashboardDto,
  type SecurityEventListResponse,
  type SecurityScoreDto,
  type UnlockAccountInput,
  type UnlockAccountResponse,
} from "@enterprise/shared";

import { authRepository } from "../auth/auth.repository.js";
import { passwordHistoryService } from "./password-history.service.js";
import {
  logSecurityAuditEvent,
  SECURITY_AUDIT_ACTIONS,
} from "./security.audit.js";
import {
  SECURITY_EVENT_TYPES,
  SECURITY_MESSAGES,
} from "./security.constants.js";
import { SECURITY_ERROR_CODES, SecurityError } from "./security.errors.js";
import {
  toActiveDeviceDto,
  toAuditLogDto,
  toLoginHistoryDto,
  toPasswordHistoryItemDto,
  toSecurityEventDto,
} from "./security.mapper.js";
import { securityRepository } from "./security.repository.js";
import type { SecurityActor, SecurityRequestContext } from "./security.types.js";

function hasPermission(actor: SecurityActor, key: string): boolean {
  return actor.permissions.includes(key) || actor.permissions.includes("*");
}

function isAdmin(actor: SecurityActor): boolean {
  return (
    actor.role === UserRole.ADMIN ||
    actor.role === UserRole.SUPER_ADMIN ||
    hasPermission(actor, PERMISSIONS.AUDIT_READ)
  );
}

function canManageSecurity(actor: SecurityActor): boolean {
  return (
    actor.role === UserRole.SUPER_ADMIN ||
    hasPermission(actor, PERMISSIONS.SECURITY_MANAGE) ||
    hasPermission(actor, PERMISSIONS.USERS_MANAGE)
  );
}

function paginationMeta(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

function buildSecurityScore(status: PasswordStatusDto): SecurityScoreDto {
  const factors = [
    {
      key: "password_set",
      label: "Password configured",
      passed: status.passwordSet,
      weight: 20,
    },
    {
      key: "password_fresh",
      label: "Password changed in last 90 days",
      passed: Boolean(
        status.passwordChangedAt &&
          Date.now() - new Date(status.passwordChangedAt).getTime() <
            90 * 24 * 60 * 60 * 1000,
      ),
      weight: 15,
    },
    {
      key: "two_factor",
      label: "Two-factor authentication enabled",
      passed: status.twoFactorEnabled,
      weight: 25,
    },
    {
      key: "not_locked",
      label: "Account not locked",
      passed: !status.isLocked,
      weight: 20,
    },
    {
      key: "clean_failures",
      label: "No recent failed login streak",
      passed: status.failedLoginCount < 3,
      weight: 10,
    },
    {
      key: "history",
      label: "Password history tracked",
      passed: status.historyCount > 0 || status.passwordSet,
      weight: 10,
    },
  ];

  const score = factors.reduce(
    (sum, factor) => sum + (factor.passed ? factor.weight : 0),
    0,
  );

  let grade: SecurityScoreDto["grade"] = "F";
  if (score >= 90) grade = "A";
  else if (score >= 75) grade = "B";
  else if (score >= 60) grade = "C";
  else if (score >= 40) grade = "D";

  return { score, grade, factors };
}

export class SecurityService {
  async getDashboard(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<SecurityDashboardDto> {
    const orgWide = isAdmin(actor);
    const scopeUserId = orgWide ? undefined : actor.userId;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      activeSessions,
      successfulLogins24h,
      failedLogins24h,
      lockedAccounts,
      unresolvedAlerts,
      auditEvents24h,
      passwordStatus,
      recentLogins,
      activeDevices,
      alerts,
      auditTimeline,
    ] = await Promise.all([
      securityRepository.countActiveSessions(scopeUserId),
      securityRepository.countLoginAttempts({
        since,
        success: true,
        userId: scopeUserId,
      }),
      securityRepository.countLoginAttempts({
        since,
        success: false,
        userId: scopeUserId,
      }),
      orgWide ? securityRepository.countLockedAccounts() : Promise.resolve(0),
      orgWide
        ? securityRepository.countUnresolvedAlerts()
        : securityRepository
            .listSecurityEvents({
              skip: 0,
              take: 1,
              unresolvedOnly: true,
              userId: actor.userId,
            })
            .then((result) => result.total),
      securityRepository.countAuditEvents(since),
      this.getPasswordStatus(actor.userId),
      securityRepository.listRecentLogins({
        take: 8,
        userId: scopeUserId,
      }),
      securityRepository.listActiveSessions({
        skip: 0,
        take: 8,
        userId: scopeUserId,
      }),
      securityRepository.listSecurityEvents({
        skip: 0,
        take: 8,
        unresolvedOnly: true,
        userId: scopeUserId,
      }),
      securityRepository.listAuditLogs({
        skip: 0,
        take: 12,
        userId: scopeUserId,
      }),
    ]);

    const securityScore = buildSecurityScore(passwordStatus);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.DASHBOARD_VIEWED,
      context,
    });

    return {
      overview: {
        activeSessions,
        successfulLogins24h,
        failedLogins24h,
        lockedAccounts: orgWide ? lockedAccounts : passwordStatus.isLocked ? 1 : 0,
        unresolvedAlerts,
        auditEvents24h,
      },
      passwordStatus,
      securityScore,
      recentLogins: recentLogins.map(toLoginHistoryDto),
      activeDevices: activeDevices.items.map((item) =>
        toActiveDeviceDto(item, actor.sessionId),
      ),
      alerts: alerts.items.map(toSecurityEventDto),
      auditTimeline: auditTimeline.items.map(toAuditLogDto),
    };
  }

  async getPasswordStatus(userId: string): Promise<PasswordStatusDto> {
    const user = await securityRepository.findUserSecurityProfile(userId);
    if (!user) {
      throw new SecurityError(
        SECURITY_MESSAGES.NOT_FOUND,
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }

    const historyCount = await securityRepository.countPasswordHistory(userId);
    const isLocked = Boolean(
      user.lockedUntil && user.lockedUntil > new Date(),
    );

    return {
      passwordSet: Boolean(user.passwordHash),
      passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
      historyCount,
      reusePreventionCount: PASSWORD_RULES.HISTORY_COUNT,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      twoFactorEnabled: user.twoFactorEnabled,
      failedLoginCount: user.failedLoginCount,
      lockedUntil: user.lockedUntil?.toISOString() ?? null,
      isLocked,
    };
  }

  async listAuditLogs(
    query: ListSecurityLogsQueryInput,
    actor: SecurityActor,
  ): Promise<SecurityAuditLogListResponse> {
    if (!isAdmin(actor)) {
      throw new SecurityError(
        SECURITY_MESSAGES.FORBIDDEN,
        403,
        SECURITY_ERROR_CODES.FORBIDDEN,
      );
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const result = await securityRepository.listAuditLogs({
      skip: (page - 1) * pageSize,
      take: pageSize,
      search: query.search,
      action: query.action,
      resource: query.resource,
      userId: query.userId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });

    return {
      items: result.items.map(toAuditLogDto),
      pagination: paginationMeta(result.total, page, pageSize),
    };
  }

  async listLoginHistory(
    query: ListLoginHistoryQueryInput,
    actor: SecurityActor,
  ): Promise<LoginHistoryListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const orgWide = isAdmin(actor);

    const result = await securityRepository.listLoginHistory({
      skip: (page - 1) * pageSize,
      take: pageSize,
      email: orgWide ? query.email : undefined,
      userId: orgWide ? query.userId : actor.userId,
      success:
        query.success === undefined ? undefined : query.success === "true",
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });

    return {
      items: result.items.map(toLoginHistoryDto),
      pagination: paginationMeta(result.total, page, pageSize),
    };
  }

  async listActiveDevices(
    query: ListActiveSessionsQueryInput,
    actor: SecurityActor,
  ): Promise<ActiveDeviceListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const orgWide = isAdmin(actor);

    const result = await securityRepository.listActiveSessions({
      skip: (page - 1) * pageSize,
      take: pageSize,
      userId: orgWide ? query.userId : actor.userId,
      search: orgWide ? query.search : undefined,
    });

    return {
      items: result.items.map((item) =>
        toActiveDeviceDto(item, actor.sessionId),
      ),
      pagination: paginationMeta(result.total, page, pageSize),
    };
  }

  async listPasswordHistory(
    actor: SecurityActor,
  ): Promise<PasswordHistoryListResponse> {
    const items = await securityRepository.listPasswordHistory(actor.userId);
    return {
      items: items.map(toPasswordHistoryItemDto),
      pagination: paginationMeta(items.length, 1, items.length || 1),
    };
  }

  async listSecurityEvents(
    query: ListSecurityEventsQueryInput,
    actor: SecurityActor,
  ): Promise<SecurityEventListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const orgWide = isAdmin(actor);

    const result = await securityRepository.listSecurityEvents({
      skip: (page - 1) * pageSize,
      take: pageSize,
      severity: query.severity,
      category: query.category,
      unresolvedOnly:
        query.unresolvedOnly === undefined
          ? undefined
          : query.unresolvedOnly === "true",
      userId: orgWide ? query.userId : actor.userId,
    });

    return {
      items: result.items.map(toSecurityEventDto),
      pagination: paginationMeta(result.total, page, pageSize),
    };
  }

  async terminateSession(
    sessionId: string,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<{ message: string }> {
    const session = await securityRepository.findActiveSession(sessionId);
    if (!session) {
      throw new SecurityError(
        SECURITY_MESSAGES.NOT_FOUND,
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }

    const ownsSession = session.userId === actor.userId;
    if (!ownsSession && !canManageSecurity(actor)) {
      throw new SecurityError(
        SECURITY_MESSAGES.FORBIDDEN,
        403,
        SECURITY_ERROR_CODES.FORBIDDEN,
      );
    }

    if (session.id === actor.sessionId) {
      throw new SecurityError(
        "Cannot terminate the current session from this action. Use logout instead.",
        400,
        SECURITY_ERROR_CODES.VALIDATION,
      );
    }

    await authRepository.revokeSession(
      session.id,
      ownsSession
        ? SessionRevokedReason.LOGOUT
        : SessionRevokedReason.ADMIN_REVOKE,
    );
    await authRepository.revokeAllSessionTokens(session.id);

    await securityRepository.createSecurityEvent({
      userId: session.userId,
      severity: "MEDIUM",
      category: "SESSION",
      eventType: SECURITY_EVENT_TYPES.SESSION_TERMINATED,
      message: ownsSession
        ? "User terminated an active session"
        : `Admin terminated session for ${session.user.email}`,
      metadata: { sessionId: session.id, terminatedBy: actor.userId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.SESSION_TERMINATED,
      resourceId: session.id,
      metadata: { targetUserId: session.userId },
      context,
    });

    return { message: SECURITY_MESSAGES.SESSION_TERMINATED };
  }

  async changePassword(
    input: ChangePasswordInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<ChangePasswordSecurityResponse> {
    const user = await securityRepository.findUserSecurityProfile(actor.userId);
    if (!user?.passwordHash) {
      throw new SecurityError(
        "Password login is not configured for this account",
        400,
        SECURITY_ERROR_CODES.VALIDATION,
      );
    }

    const valid = await passwordHistoryService.verifyPassword(
      user.passwordHash,
      input.currentPassword,
    );
    if (!valid) {
      throw new SecurityError(
        "Current password is incorrect",
        400,
        SECURITY_ERROR_CODES.VALIDATION,
      );
    }

    try {
      await passwordHistoryService.assertNotReused(
        actor.userId,
        input.newPassword,
        user.passwordHash,
      );
    } catch (error) {
      if (
        error instanceof SecurityError &&
        error.code === SECURITY_ERROR_CODES.PASSWORD_REUSED
      ) {
        await securityRepository.createSecurityEvent({
          userId: actor.userId,
          severity: "LOW",
          category: "POLICY",
          eventType: SECURITY_EVENT_TYPES.PASSWORD_REUSE,
          message: "Password reuse blocked",
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        });
        await logSecurityAuditEvent({
          userId: actor.userId,
          action: SECURITY_AUDIT_ACTIONS.PASSWORD_REUSE_BLOCKED,
          context,
        });
      }
      throw error;
    }

    const nextHash = await passwordHistoryService.hashPassword(input.newPassword);
    await passwordHistoryService.recordPasswordChange(
      actor.userId,
      user.passwordHash,
    );
    const updated = await securityRepository.updateUserPassword(
      actor.userId,
      nextHash,
    );

    await authRepository.revokeOtherUserSessions(
      actor.userId,
      actor.sessionId ?? "",
      SessionRevokedReason.PASSWORD_CHANGE,
    );

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.PASSWORD_CHANGED,
      context,
    });

    return {
      message: SECURITY_MESSAGES.PASSWORD_CHANGED,
      passwordChangedAt:
        updated.passwordChangedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  async unlockAccount(
    input: UnlockAccountInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<UnlockAccountResponse> {
    if (!canManageSecurity(actor)) {
      throw new SecurityError(
        SECURITY_MESSAGES.FORBIDDEN,
        403,
        SECURITY_ERROR_CODES.FORBIDDEN,
      );
    }

    const user = await securityRepository.findUserSecurityProfile(input.userId);
    if (!user) {
      throw new SecurityError(
        SECURITY_MESSAGES.NOT_FOUND,
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }

    const isLocked = Boolean(
      (user.lockedUntil && user.lockedUntil > new Date()) ||
        user.status === "LOCKED",
    );
    if (!isLocked && user.failedLoginCount === 0) {
      throw new SecurityError(
        "Account is not locked",
        400,
        SECURITY_ERROR_CODES.ACCOUNT_NOT_LOCKED,
      );
    }

    await securityRepository.unlockUser(input.userId);

    await securityRepository.createSecurityEvent({
      userId: input.userId,
      severity: "INFO",
      category: "ACCOUNT",
      eventType: SECURITY_EVENT_TYPES.ACCOUNT_UNLOCKED,
      message: `Account unlocked by ${actor.email}`,
      metadata: { reason: input.reason ?? null, unlockedBy: actor.userId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.ACCOUNT_UNLOCKED,
      resourceId: input.userId,
      metadata: { reason: input.reason ?? null },
      context,
    });

    return {
      message: SECURITY_MESSAGES.ACCOUNT_UNLOCKED,
      userId: input.userId,
      unlockedAt: new Date().toISOString(),
    };
  }

  async resolveAlert(
    eventId: string,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ) {
    if (!canManageSecurity(actor)) {
      throw new SecurityError(
        SECURITY_MESSAGES.FORBIDDEN,
        403,
        SECURITY_ERROR_CODES.FORBIDDEN,
      );
    }

    const existing = await securityRepository.findSecurityEvent(eventId);
    if (!existing) {
      throw new SecurityError(
        SECURITY_MESSAGES.NOT_FOUND,
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }

    const updated = await securityRepository.resolveSecurityEvent(eventId);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.ALERT_RESOLVED,
      resourceId: eventId,
      context,
    });

    return {
      message: SECURITY_MESSAGES.ALERT_RESOLVED,
      event: toSecurityEventDto(updated),
    };
  }

  async submitContact(
    input: ContactFormInput,
    context: SecurityRequestContext,
  ): Promise<ContactFormResponse> {
    const ticketId = randomUUID();

    await logSecurityAuditEvent({
      action: SECURITY_AUDIT_ACTIONS.CONTACT_SUBMITTED,
      resourceId: ticketId,
      metadata: {
        name: input.name,
        email: input.email,
        subject: input.subject,
        // Store truncated message only — avoid dumping full PII into audit forever
        messagePreview: input.message.slice(0, 200),
      },
      context,
    });

    await securityRepository.createSecurityEvent({
      severity: "INFO",
      category: "API",
      eventType: "contact_form",
      message: `Contact form submitted: ${input.subject}`,
      metadata: { ticketId, email: input.email },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      message: SECURITY_MESSAGES.CONTACT_RECEIVED,
      ticketId,
    };
  }
}

export const securityService = new SecurityService();
