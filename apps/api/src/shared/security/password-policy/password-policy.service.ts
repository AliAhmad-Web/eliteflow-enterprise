import { prisma } from "@enterprise/database";
import {
  AUTH_ERROR_CODES,
  PASSWORD_RULES,
} from "@enterprise/shared";

import { AuthError } from "../../../modules/auth/auth.errors.js";
import { passwordHistoryService } from "../../../modules/security/password-history.service.js";
import { passwordSetupService } from "../../../modules/auth/password-setup/index.js";
import { writeAuditLogSafe } from "../write-audit-log.js";

import {
  PASSWORD_CHANGE_REASONS,
  PASSWORD_CHANGE_REQUIRED_MESSAGE,
  PASSWORD_POLICY_AUDIT_ACTIONS,
  PASSWORD_POLICY_AUDIT_RESOURCE,
  type PasswordChangeReason,
} from "./password-policy.constants.js";
import type {
  AllowedEndpointRule,
  EnforcePasswordChangeContext,
  PasswordChangeDecision,
  PasswordPolicyConfig,
  PasswordPolicyUserSnapshot,
} from "./password-policy.types.js";

/**
 * Endpoints allowed while a password change is required.
 * Paths are relative to /api/v1.
 */
const ALLOWED_WHILE_PASSWORD_CHANGE_REQUIRED: readonly AllowedEndpointRule[] = [
  { method: "POST", path: "/security/password/change" },
  { method: "POST", path: "/auth/change-password" },
  { method: "POST", path: "/auth/logout" },
  { method: "GET", path: "/auth/me" },
  { method: "GET", path: "/users/me" },
  { method: "GET", path: "/profile" },
  { method: "GET", path: "/security/password-status" },
  { method: "GET", path: "/security/password-history" },
  { method: "GET", path: "/security/password-policy" },
  { method: "GET", path: "/security/csrf-token" },
  // MFA required to complete login / step-up while gated
  { method: "*", path: "/auth/mfa", prefix: true, anyMethod: true },
] as const;

function normalizeApiPath(raw: string): string {
  const withoutQuery = (raw.split("?")[0] ?? raw).replace(/\/{2,}/g, "/");
  const stripped = withoutQuery.replace(/^\/api\/v\d+/, "");
  if (!stripped || stripped === "") return "/";
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

function requestPathFromParts(baseUrl: string, path: string): string {
  return normalizeApiPath(`${baseUrl ?? ""}${path ?? ""}`);
}

export class PasswordPolicyService {
  getPolicy(): PasswordPolicyConfig {
    return {
      minLength: PASSWORD_RULES.MIN_LENGTH,
      maxLength: PASSWORD_RULES.MAX_LENGTH,
      requireUppercase: PASSWORD_RULES.REQUIRE_UPPERCASE,
      requireLowercase: PASSWORD_RULES.REQUIRE_LOWERCASE,
      requireDigit: PASSWORD_RULES.REQUIRE_DIGIT,
      requireSpecial: PASSWORD_RULES.REQUIRE_SPECIAL,
      historyCount: PASSWORD_RULES.HISTORY_COUNT,
      minAgeHours: PASSWORD_RULES.MIN_AGE_HOURS,
      maxAgeDays: PASSWORD_RULES.MAX_AGE_DAYS,
    };
  }

  allowedEndpoints(): readonly AllowedEndpointRule[] {
    return ALLOWED_WHILE_PASSWORD_CHANGE_REQUIRED;
  }

  isAllowedEndpoint(method: string, path: string): boolean {
    const normalizedPath = normalizeApiPath(path);
    const normalizedMethod = method.toUpperCase();

    for (const rule of ALLOWED_WHILE_PASSWORD_CHANGE_REQUIRED) {
      const methodOk =
        rule.anyMethod ||
        rule.method === "*" ||
        rule.method.toUpperCase() === normalizedMethod;
      if (!methodOk) continue;

      if (rule.prefix) {
        if (
          normalizedPath === rule.path ||
          normalizedPath.startsWith(`${rule.path}/`)
        ) {
          return true;
        }
        continue;
      }

      if (normalizedPath === rule.path) {
        return true;
      }
    }

    return false;
  }

  passwordAge(passwordChangedAt: Date | null | undefined): number | null {
    if (!passwordChangedAt) return null;
    const ms = Date.now() - passwordChangedAt.getTime();
    if (ms < 0) return 0;
    return Math.floor(ms / (24 * 60 * 60 * 1000));
  }

  passwordExpired(
    passwordChangedAt: Date | null | undefined,
    maxAgeDays: number = PASSWORD_RULES.MAX_AGE_DAYS,
  ): boolean {
    if (!maxAgeDays || maxAgeDays <= 0) return false;
    if (!passwordChangedAt) {
      // Password never set / never rotated — treat as expired when a hash exists
      // only when callers also confirm passwordSet; here null age is not auto-expired
      // without a known change date for accounts that just set a password via setup.
      return false;
    }
    const ageDays = this.passwordAge(passwordChangedAt);
    return ageDays !== null && ageDays >= maxAgeDays;
  }

  /**
   * Accounts with no passwordChangedAt but with a passwordHash are treated as
   * expired once max age policy is active (legacy / unknown age).
   */
  passwordExpiredForUser(user: PasswordPolicyUserSnapshot): boolean {
    if (!PASSWORD_RULES.MAX_AGE_DAYS || PASSWORD_RULES.MAX_AGE_DAYS <= 0) {
      return false;
    }
    if (!user.passwordHash) return false;
    if (!user.passwordChangedAt) return true;
    return this.passwordExpired(user.passwordChangedAt);
  }

  requiresPasswordChange(user: PasswordPolicyUserSnapshot): PasswordChangeDecision {
    const reasons: PasswordChangeReason[] = [];
    const expired = this.passwordExpiredForUser(user);
    const passwordSet = Boolean(user.passwordHash);

    if (user.mustChangePassword) {
      reasons.push(PASSWORD_CHANGE_REASONS.MUST_CHANGE_FLAG);
    }
    if (expired) {
      reasons.push(PASSWORD_CHANGE_REASONS.PASSWORD_EXPIRED);
    }
    if (!passwordSet) {
      reasons.push(PASSWORD_CHANGE_REASONS.SETUP_PENDING);
    }

    return {
      requiresChange: user.mustChangePassword || expired,
      expired,
      ageDays: this.passwordAge(user.passwordChangedAt),
      reasons,
      mustChangePassword: user.mustChangePassword,
      passwordSet,
    };
  }

  async loadUserSnapshot(
    userId: string,
  ): Promise<PasswordPolicyUserSnapshot | null> {
    return prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        mustChangePassword: true,
        passwordHash: true,
        passwordChangedAt: true,
        deletedAt: true,
      },
    });
  }

  async evaluateUser(userId: string): Promise<PasswordChangeDecision | null> {
    const user = await this.loadUserSnapshot(userId);
    if (!user) return null;
    return this.requiresPasswordChange(user);
  }

  async passwordHistory(userId: string): Promise<{
    count: number;
    retention: number;
  }> {
    const count = await prisma.passwordHistory.count({ where: { userId } });
    return {
      count,
      retention: PASSWORD_RULES.HISTORY_COUNT,
    };
  }

  /**
   * Persist mustChangePassword when password age expires (idempotent).
   * Emits PASSWORD_EXPIRED once when flipping the flag.
   */
  async ensureExpiredFlag(
    user: PasswordPolicyUserSnapshot,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<PasswordPolicyUserSnapshot> {
    if (user.mustChangePassword) return user;
    if (!this.passwordExpiredForUser(user)) return user;

    await prisma.user.update({
      where: { id: user.id },
      data: { mustChangePassword: true },
    });

    await writeAuditLogSafe(
      {
        userId: user.id,
        action: PASSWORD_POLICY_AUDIT_ACTIONS.EXPIRED,
        resource: PASSWORD_POLICY_AUDIT_RESOURCE,
        resourceId: user.id,
        metadata: {
          ageDays: this.passwordAge(user.passwordChangedAt),
          maxAgeDays: PASSWORD_RULES.MAX_AGE_DAYS,
        },
        ipAddress: context?.ipAddress ?? null,
        userAgent: context?.userAgent ?? null,
      },
      "password-policy-audit",
    );

    return { ...user, mustChangePassword: true };
  }

  /**
   * Block protected requests when a password change is required.
   * Allowed endpoints short-circuit. Throws AuthError 403 otherwise.
   */
  async enforcePasswordChange(
    context: EnforcePasswordChangeContext,
  ): Promise<PasswordChangeDecision | null> {
    if (this.isAllowedEndpoint(context.method, context.path)) {
      return null;
    }

    let user =
      context.userSnapshot && context.userSnapshot.id === context.userId
        ? context.userSnapshot
        : await this.loadUserSnapshot(context.userId);
    if (!user) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    user = await this.ensureExpiredFlag(user, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const decision = this.requiresPasswordChange(user);
    // OAuth accounts may have no passwordHash — only enforce when flagged or expired.
    const mustBlock = user.mustChangePassword || decision.expired;

    if (!mustBlock) {
      return decision;
    }

    await writeAuditLogSafe(
      {
        userId: context.userId,
        action: PASSWORD_POLICY_AUDIT_ACTIONS.CHANGE_BLOCKED,
        resource: PASSWORD_POLICY_AUDIT_RESOURCE,
        resourceId: context.userId,
        metadata: {
          path: context.path,
          method: context.method,
          reasons: decision.reasons,
        },
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
      "password-policy-audit",
    );

    throw new AuthError(
      PASSWORD_CHANGE_REQUIRED_MESSAGE,
      403,
      AUTH_ERROR_CODES.PASSWORD_CHANGE_REQUIRED,
    );
  }

  /**
   * Post-change completion: clear flags, rotate history (caller), invalidate
   * setup tokens, audit success. Does not hash or set the password itself.
   */
  async completePasswordChange(
    userId: string,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    await passwordSetupService.invalidateUserTokens(userId);

    await writeAuditLogSafe(
      {
        userId,
        action: PASSWORD_POLICY_AUDIT_ACTIONS.CHANGE_COMPLETED,
        resource: PASSWORD_POLICY_AUDIT_RESOURCE,
        resourceId: userId,
        metadata: { passwordSetupRequired: false },
        ipAddress: context?.ipAddress ?? null,
        userAgent: context?.userAgent ?? null,
      },
      "password-policy-audit",
    );
  }

  async markPasswordChangeRequired(
    userId: string,
    reason: PasswordChangeReason,
    context?: { ipAddress?: string | null; userAgent?: string | null; actorUserId?: string | null },
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { mustChangePassword: true },
    });

    await writeAuditLogSafe(
      {
        userId: context?.actorUserId ?? userId,
        action: PASSWORD_POLICY_AUDIT_ACTIONS.CHANGE_REQUIRED,
        resource: PASSWORD_POLICY_AUDIT_RESOURCE,
        resourceId: userId,
        metadata: { reason, targetUserId: userId },
        ipAddress: context?.ipAddress ?? null,
        userAgent: context?.userAgent ?? null,
      },
      "password-policy-audit",
    );
  }

  async assertNotReused(
    userId: string,
    newPassword: string,
    currentHash?: string | null,
  ): Promise<void> {
    try {
      await passwordHistoryService.assertNotReused(
        userId,
        newPassword,
        currentHash,
      );
    } catch (error) {
      await writeAuditLogSafe(
        {
          userId,
          action: PASSWORD_POLICY_AUDIT_ACTIONS.HISTORY_REJECTED,
          resource: PASSWORD_POLICY_AUDIT_RESOURCE,
          resourceId: userId,
          metadata: { historyCount: PASSWORD_RULES.HISTORY_COUNT },
        },
        "password-policy-audit",
      );
      throw error;
    }
  }

  /**
   * Reject voluntary changes that violate minimum age.
   * Forced changes (mustChangePassword / expired) bypass min age.
   */
  assertMinimumAge(
    user: PasswordPolicyUserSnapshot,
    options?: { force?: boolean },
  ): void {
    if (options?.force || user.mustChangePassword) return;
    if (this.passwordExpiredForUser(user)) return;

    const minHours = PASSWORD_RULES.MIN_AGE_HOURS;
    if (!minHours || minHours <= 0) return;
    if (!user.passwordChangedAt) return;

    const ageMs = Date.now() - user.passwordChangedAt.getTime();
    const minMs = minHours * 60 * 60 * 1000;
    if (ageMs < minMs) {
      throw new AuthError(
        "Password was changed too recently. Please try again later.",
        400,
        AUTH_ERROR_CODES.VALIDATION_ERROR,
      );
    }
  }

  resolveRequestPath(baseUrl: string, path: string): string {
    return requestPathFromParts(baseUrl, path);
  }
}

export const passwordPolicyService = new PasswordPolicyService();
