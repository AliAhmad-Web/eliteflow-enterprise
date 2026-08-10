import type { NextFunction, Request, Response } from "express";

import {
  AUTH_ERROR_CODES,
  AUTH_HEADERS,
  type UserRole,
} from "@enterprise/shared";

import {
  isApiSecurityPermissionRefreshEnabled,
  isApiZeroTrustEnabled,
} from "../config/security-flags.js";
import { AuthError } from "../modules/auth/auth.errors.js";
import { AuthRepository } from "../modules/auth/auth.repository.js";
import { verifyAccessToken } from "../modules/auth/auth.tokens.js";
import { sessionService } from "../modules/auth/session/index.js";
import { passwordPolicyService } from "../shared/security/password-policy/index.js";
import { enforceMfaEnrollment } from "../shared/security/mfa-enrollment/index.js";
import { sessionHardeningService } from "../shared/security/session-hardening/index.js";
import { deviceManagementService } from "../shared/security/device-management/index.js";
import { evaluateZeroTrust } from "../shared/security/zero-trust/index.js";

const authRepository = new AuthRepository();

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers[AUTH_HEADERS.AUTHORIZATION.toLowerCase()];

    if (
      typeof header !== "string" ||
      !header.startsWith(AUTH_HEADERS.BEARER_PREFIX)
    ) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const token = header.slice(AUTH_HEADERS.BEARER_PREFIX.length);
    const payload = verifyAccessToken(token);

    req.auth = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
      sessionId: payload.sessionId,
    };

    // Enterprise session validation — JWT is never trusted alone.
    // Order: signature → session active → hardening risk → device mgmt → password policy → Zero Trust → RBAC
    const deviceFingerprint =
      typeof req.headers["x-device-fingerprint"] === "string"
        ? req.headers["x-device-fingerprint"]
        : null;

    const validated = await sessionService.validateSession({
      sessionId: payload.sessionId,
      userId: payload.sub,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
      deviceFingerprint,
      touch: true,
    });

    // Independent Redis checks — run in parallel (same security outcomes).
    const [hardening, blocked] = await Promise.all([
      sessionHardeningService.assess({
        sessionId: validated.sessionId,
        userId: validated.userId,
        sessionIp: validated.ipAddress,
        sessionUa: validated.userAgent,
        sessionFingerprintHash: validated.fingerprintHash,
        requestIp: req.ip ?? null,
        requestUa: req.get("user-agent") ?? null,
        requestFingerprint: deviceFingerprint,
        twoFactorEnabled: validated.twoFactorEnabled,
        passwordChangedAt: validated.passwordChangedAt,
        createdAt: validated.createdAt,
      }),
      deviceManagementService.isBlockedFingerprint(
        payload.sub,
        deviceFingerprint,
      ),
    ]);

    req.sessionHardening = hardening;

    if (blocked) {
      throw new AuthError(
        "This device has been blocked",
        403,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    void deviceManagementService.observeDevice({
      userId: payload.sub,
      deviceFingerprint,
      userAgent: req.get("user-agent") ?? null,
      ipAddress: req.ip ?? null,
      sessionId: payload.sessionId,
    });

    // Reduce stale JWT permission windows without changing token format.
    if (isApiSecurityPermissionRefreshEnabled()) {
      const previousRole = req.auth.role;
      const user = await authRepository.findUserById(payload.sub);
      if (!user || !user.role) {
        throw new AuthError(
          "Authentication required",
          401,
          AUTH_ERROR_CODES.TOKEN_INVALID,
        );
      }

      req.auth.role = user.role.code as UserRole;
      req.auth.permissions = user.role.rolePermissions.map(
        (rp) => rp.permission.key,
      );
      req.auth.email = user.email;

      // Privilege change mid-session — rotate identifiers (keep current).
      if (previousRole !== req.auth.role) {
        await sessionHardeningService.rotateAfterPrivilegeChange({
          userId: payload.sub,
          currentSessionId: payload.sessionId,
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
          previousRole,
          nextRole: req.auth.role,
        });
      }
    }

    // Force password change — reuse session-loaded user snapshot (no second fetch).
    await passwordPolicyService.enforcePasswordChange({
      userId: payload.sub,
      method: req.method,
      path: passwordPolicyService.resolveRequestPath(
        req.baseUrl ?? "",
        req.path ?? "",
      ),
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
      userSnapshot: {
        id: validated.userId,
        mustChangePassword: validated.mustChangePassword,
        passwordHash: validated.passwordHash,
        passwordChangedAt: validated.passwordChangedAt,
        deletedAt: null,
      },
    });

    // Prefer DB role from session validation over JWT claims so CLIENT/EMPLOYEE
    // never inherit a stale privileged role for the MFA enrollment gate.
    if (validated.roleCode) {
      req.auth.role = validated.roleCode as UserRole;
    }

    // Hard MFA for ADMIN / SUPER_ADMIN — fail-closed until enrolled.
    // Role source: DB (session.user.role) with JWT fallback only if missing.
    await enforceMfaEnrollment({
      userId: payload.sub,
      role: validated.roleCode ?? req.auth.role,
      twoFactorEnabled: validated.twoFactorEnabled,
      method: req.method,
      path: passwordPolicyService.resolveRequestPath(
        req.baseUrl ?? "",
        req.path ?? "",
      ),
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });

    // Continuous Zero Trust — never assume trust from login alone.
    if (isApiZeroTrustEnabled()) {
      // Stash preloaded session/user for ZT to skip duplicate Prisma reads.
      (
        req as Request & {
          zeroTrustPreload?: {
            session: {
              id: string;
              userId: string;
              ipAddress: string | null;
              userAgent: string | null;
              revokedAt: Date | null;
              createdAt: Date;
              lastActiveAt: Date;
            };
            user: {
              id: string;
              status: string;
              passwordChangedAt: Date | null;
              twoFactorEnabled: boolean;
              lockedUntil: Date | null;
            };
          };
        }
      ).zeroTrustPreload = {
        session: {
          id: validated.sessionId,
          userId: validated.userId,
          ipAddress: validated.ipAddress,
          userAgent: validated.userAgent,
          revokedAt: null,
          createdAt: validated.createdAt,
          lastActiveAt: validated.lastActiveAt,
        },
        user: {
          id: validated.userId,
          status: validated.userStatus,
          passwordChangedAt: validated.passwordChangedAt,
          twoFactorEnabled: validated.twoFactorEnabled,
          lockedUntil: validated.lockedUntil,
        },
      };
      await evaluateZeroTrust(req, res, next);
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
