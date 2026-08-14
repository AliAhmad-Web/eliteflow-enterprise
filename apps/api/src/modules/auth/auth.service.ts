import * as argon2 from "argon2";

import {
  AUTH_ERROR_CODES,
  OTP_RULES,
  OtpPurpose,
  SessionStatus,
  TOKEN_EXPIRATION,
  UserRole,
  type OAuthProvider as OAuthProviderType,
  type Session as SessionDto,
} from "@enterprise/shared";
import {
  OAuthProvider,
  Prisma,
  SessionRevokedReason,
  UserStatus,
} from "@enterprise/database";

import {
  AUTH_AUDIT_ACTIONS,
  AUTH_MESSAGES,
  LOGIN_FAILURE_REASONS,
} from "./auth.constants.js";
import { AuthError } from "./auth.errors.js";
import {
  logAuthAuditEvent,
  logLoginAttempt,
  scheduleAuthAuditEvent,
} from "./auth.audit.js";
import {
  buildEmailVerificationUrl,
  emailService,
  EmailDeliveryError,
} from "../../integrations/email/email.service.js";
import {
  verifySupabaseOAuthToken,
  type VerifiedOAuthIdentity,
} from "../../integrations/supabase/supabase.auth.js";
import { isSupabaseConfigured } from "../../config/supabase.config.js";
import {
  generateAccessToken,
  generateOpaqueRefreshToken,
  getAccessTokenExpiresIn,
  getEmailVerificationExpiresAt,
  getRefreshTokenExpiresAt,
  hashOpaqueToken,
  hashRefreshToken,
} from "./auth.tokens.js";
import { authRepository } from "./auth.repository.js";
import {
  PASSWORD_SETUP_PURPOSE,
  passwordSetupService,
} from "./password-setup/index.js";
import { passwordPolicyService } from "../../shared/security/password-policy/index.js";
import { passwordHistoryService } from "../security/password-history.service.js";
import { securityRepository } from "../security/security.repository.js";
import { securityMonitoringService } from "../../shared/security/monitoring/index.js";
import {
  SECURITY_ERROR_CODES,
  SecurityError,
} from "../security/security.errors.js";
import {
  generateOtpCode,
  getOtpExpiresAt,
  getOtpExpiresInSeconds,
  hashOtpCode,
  verifyOtpCodeHash,
} from "./auth.otp.js";
import type {
  AuthSessionResult,
  LoginServiceInput,
  LoginServiceResult,
  LoginSessionResult,
  OtpChallengeResult,
  RequestContext,
  SignupServiceInput,
  UserWithRoleAndPermissions,
  VerifyOtpServiceResult,
} from "./auth.types.js";
import { parseDeviceName, toSafeUser } from "./auth.types.js";
import { parseDeviceInfo } from "./auth.device.js";
import {
  isMfaMandatoryRole,
  isMfaOptionalRole,
  mfaService,
} from "./mfa/index.js";
import {
  sessionService,
  SESSION_AUDIT_ACTIONS,
  SESSION_INVALID_MESSAGE,
} from "./session/index.js";
import { sessionHardeningService } from "../../shared/security/session-hardening/index.js";
import { ensurePortalCompanyLink } from "../clients/client-company-onboarding.service.js";
import { deviceManagementService } from "../../shared/security/device-management/index.js";

export class AuthService {
  /** Bridges rememberMe across MFA challenge → verify (no Redis). */
  private readonly rememberMePending = new Map<
    string,
    { rememberMe: boolean; expiresAt: number }
  >();

  private consumeRememberMe(otpSessionId: string): boolean {
    const entry = this.rememberMePending.get(otpSessionId);
    this.rememberMePending.delete(otpSessionId);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) return false;
    return entry.rememberMe;
  }

  async signup(input: SignupServiceInput, context: RequestContext) {
    const emailTaken = await authRepository.emailExists(input.email);
    if (emailTaken) {
      throw new AuthError(
        "An account with this email already exists",
        409,
        AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS,
      );
    }

    const clientRole = await authRepository.getDefaultClientRole();
    if (!clientRole) {
      throw new AuthError(
        "Default client role is not configured",
        500,
        AUTH_ERROR_CODES.INTERNAL_ERROR,
      );
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    const user = await authRepository.createUser({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      roleId: clientRole.id,
      status: UserStatus.PENDING_VERIFICATION,
    });

    try {
      await ensurePortalCompanyLink(user.id, {
        userId: user.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    } catch (error) {
      console.error(
        "[auth] Signup succeeded but portal company link failed:",
        error,
      );
    }

    await logAuthAuditEvent({
      userId: user.id,
      action: AUTH_AUDIT_ACTIONS.SIGNUP,
      resourceId: user.id,
      metadata: { email: user.email },
      context,
    });

    let emailSent = true;
    let emailError: string | undefined;

    try {
      await this.sendVerificationEmailForUser(user, context);
    } catch (error) {
      emailSent = false;
      emailError =
        error instanceof EmailDeliveryError
          ? error.message
          : "Verification email could not be sent. Please use Resend verification email.";
      console.error("[auth] Signup succeeded but verification email failed:", error);
    }

    return {
      message: emailSent
        ? "Account created. Please verify your email to continue."
        : "Account created, but the verification email could not be sent.",
      email: user.email,
      emailSent,
      emailError,
    };
  }

  async login(input: LoginServiceInput, context: RequestContext): Promise<LoginServiceResult> {
    let user = await authRepository.findUserByEmail(input.email);

    if (!user) {
      // Constant-time-ish path: still run a hash verify against a dummy hash.
      await argon2.verify(
        "$argon2id$v=19$m=19456,t=2,p=1$njLxO3+FR75gBcsPmugafw$Wy3ajrzYiSwih+G2tIlU+60nkLNF4JhmazsfJT+8Bzw",
        input.password,
      ).catch(() => false);

      await logLoginAttempt({
        email: input.email,
        success: false,
        failureReason: LOGIN_FAILURE_REASONS.INVALID_CREDENTIALS,
        context,
      });

      throw new AuthError(
        "Invalid email or password",
        401,
        AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      );
    }

    await this.assertUserCanLogin(user, context);

    const passwordValid = await this.verifyPassword(user, input.password, context);
    if (!passwordValid) {
      await this.handleFailedLogin(user, context);
      throw new AuthError(
        "Invalid email or password",
        401,
        AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      );
    }

    user = await this.syncMfaEnrollmentFlag(user);

    if (user.twoFactorEnabled) {
      if (user.twoFactorSecret) {
        const otpChallenge = await this.issueTotpChallenge(user, context);
        this.rememberMePending.set(otpChallenge.otpSessionId, {
          rememberMe: Boolean(input.rememberMe),
          expiresAt: Date.now() + OTP_RULES.EXPIRY_MINUTES_LOGIN * 60 * 1000,
        });
        return {
          requiresOtp: true,
          otpSessionId: otpChallenge.otpSessionId,
          expiresIn: otpChallenge.expiresIn,
          mfaMethod: "totp",
        };
      }

      // Legacy email OTP path when 2FA was flagged without a TOTP secret.
      const otpChallenge = await this.issueOtpChallenge(
        user,
        OtpPurpose.LOGIN_2FA,
        context,
      );
      this.rememberMePending.set(otpChallenge.otpSessionId, {
        rememberMe: Boolean(input.rememberMe),
        expiresAt: Date.now() + OTP_RULES.EXPIRY_MINUTES_LOGIN * 60 * 1000,
      });

      return {
        requiresOtp: true,
        otpSessionId: otpChallenge.otpSessionId,
        expiresIn: otpChallenge.expiresIn,
        mfaMethod: "email",
      };
    }

    const sessionResult = await this.createUserSession(user, context, {
      rememberMe: Boolean(input.rememberMe),
      deviceFingerprint: context.deviceFingerprint,
    });

    await authRepository.recordSuccessfulLogin(user.id);

    await logLoginAttempt({
      email: user.email,
      userId: user.id,
      success: true,
      context,
    });

    await logAuthAuditEvent({
      userId: user.id,
      action: AUTH_AUDIT_ACTIONS.LOGIN,
      resourceId: sessionResult.sessionId,
      context,
    });

    return {
      user: toSafeUser(user),
      tokens: {
        accessToken: sessionResult.accessToken,
        expiresIn: sessionResult.expiresIn,
        tokenType: "Bearer" as const,
      },
      refreshToken: sessionResult.refreshToken,
    };
  }

  async logout(
    sessionId: string,
    userId: string,
    context: RequestContext,
  ): Promise<void> {
    await sessionService.revokeSession({
      sessionId,
      userId,
      reason: SessionRevokedReason.LOGOUT,
      actorUserId: userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      auditAction: SESSION_AUDIT_ACTIONS.REVOKED,
      metadata: { flow: "logout" },
    });

    await logAuthAuditEvent({
      userId,
      action: AUTH_AUDIT_ACTIONS.LOGOUT,
      resourceId: sessionId,
      context,
    });
  }

  async refresh(refreshToken: string, context: RequestContext) {
    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await authRepository.findRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      throw new AuthError(
        "Invalid refresh token",
        401,
        AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID,
      );
    }

    if (storedToken.revokedAt) {
      // Concurrent refresh race: another request already rotated this token.
      // Never wipe the session for a token that was replaced via normal rotation —
      // that is almost always a parallel tab / Strict Mode / duplicated chunk race.
      // True theft of a non-rotated revoked token still triggers reuse handling.
      if (
        storedToken.replacedByTokenId &&
        !storedToken.session.revokedAt
      ) {
        const user = storedToken.user;
        await this.assertUserCanLogin(user, context);

        const permissions = user.role.rolePermissions.map(
          (rp) => rp.permission.key,
        );
        const accessToken = generateAccessToken({
          userId: user.id,
          email: user.email,
          role: user.role.code as UserRole,
          permissions,
          sessionId: storedToken.sessionId,
        });

        // Access token only — browser already has (or will get) the winning
        // refresh cookie from the request that completed rotation.
        const safeUser = toSafeUser(await this.syncMfaEnrollmentFlag(user));
        return {
          accessToken,
          refreshToken: null as string | null,
          expiresIn: getAccessTokenExpiresIn(),
          user: safeUser,
        };
      }

      await this.handleRefreshTokenReuse(
        storedToken.sessionId,
        storedToken.userId,
        context,
      );
      throw new AuthError(
        "Refresh token reuse detected",
        401,
        AUTH_ERROR_CODES.REFRESH_TOKEN_REUSED,
      );
    }

    if (storedToken.expiresAt < new Date()) {
      throw new AuthError(
        "Refresh token expired",
        401,
        AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID,
      );
    }

    if (storedToken.session.revokedAt) {
      throw new AuthError(
        SESSION_INVALID_MESSAGE,
        401,
        AUTH_ERROR_CODES.SESSION_INVALID,
      );
    }

    // Full enterprise session validation on refresh as well
    await sessionService.validateSession({
      sessionId: storedToken.sessionId,
      userId: storedToken.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      touch: true,
    });

    const user = storedToken.user;
    await this.assertUserCanLogin(user, context);

    const permissions = user.role.rolePermissions.map((rp) => rp.permission.key);
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role.code as UserRole,
      permissions,
      sessionId: storedToken.sessionId,
    });

    // Skip rotation for young tokens. F5 / parallel callers within this window
    // reuse the same refresh cookie — eliminates rotation races that caused
    // logout-on-refresh. Still rotate periodically for theft mitigation.
    const ROTATE_AFTER_MS = 15 * 60 * 1000;
    const tokenAgeMs = Date.now() - storedToken.createdAt.getTime();
    if (tokenAgeMs < ROTATE_AFTER_MS) {
      // Non-blocking: refresh must not await integrity-chain audit / advisory lock.
      scheduleAuthAuditEvent({
        userId: user.id,
        action: AUTH_AUDIT_ACTIONS.REFRESH,
        resourceId: storedToken.sessionId,
        context,
      });

      return {
        accessToken,
        refreshToken: null as string | null,
        expiresIn: getAccessTokenExpiresIn(),
        user: toSafeUser(await this.syncMfaEnrollmentFlag(user)),
      };
    }

    const newOpaqueToken = generateOpaqueRefreshToken();
    const newTokenHash = hashRefreshToken(newOpaqueToken);
    // Preserve remaining refresh lifetime (remember-me aware)
    const expiresAt =
      storedToken.expiresAt > new Date()
        ? storedToken.expiresAt
        : getRefreshTokenExpiresAt();

    const rotated = await authRepository.rotateRefreshToken({
      oldTokenId: storedToken.id,
      newTokenHash,
      sessionId: storedToken.sessionId,
      userId: storedToken.userId,
      expiresAt,
    });

    // Lost the rotation race — another request already rotated. Issue access
    // token only; the winning request's Set-Cookie is already in the jar.
    if (!rotated) {
      scheduleAuthAuditEvent({
        userId: user.id,
        action: AUTH_AUDIT_ACTIONS.REFRESH,
        resourceId: storedToken.sessionId,
        context,
      });

      return {
        accessToken,
        refreshToken: null as string | null,
        expiresIn: getAccessTokenExpiresIn(),
        user: toSafeUser(await this.syncMfaEnrollmentFlag(user)),
      };
    }

    scheduleAuthAuditEvent({
      userId: user.id,
      action: AUTH_AUDIT_ACTIONS.REFRESH,
      resourceId: storedToken.sessionId,
      context,
    });

    return {
      accessToken,
      expiresIn: getAccessTokenExpiresIn(),
      refreshToken: newOpaqueToken,
      user: toSafeUser(await this.syncMfaEnrollmentFlag(user)),
    };
  }

  async getCurrentUser(userId: string) {
    const user = await authRepository.findUserById(userId);

    if (!user) {
      throw new AuthError(
        "User not found",
        404,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    return toSafeUser(user);
  }

  async forgotPassword(email: string, context: RequestContext) {
    const user = await authRepository.findUserByEmail(email);

    // Issue setup token for any active account (including those without a password yet)
    if (user && user.deletedAt === null) {
      const setup = await passwordSetupService.createToken({
        userId: user.id,
        purpose: PASSWORD_SETUP_PURPOSE.FORGOT_PASSWORD,
        audit: {
          userId: user.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });

      try {
        await emailService.sendPasswordSetupEmail({
          to: user.email,
          firstName: user.firstName,
          setupUrl: setup.setupUrl,
          expiresInMinutes: setup.expiresInMinutes,
          kind: "forgot_password",
        });
      } catch (error) {
        console.error("[auth] Password reset email failed:", error);
        const message =
          error instanceof EmailDeliveryError
            ? error.message
            : "Password reset email could not be sent. Please try again later.";
        throw new AuthError(
          message,
          502,
          AUTH_ERROR_CODES.EMAIL_DELIVERY_FAILED,
        );
      }

      await logAuthAuditEvent({
        userId: user.id,
        action: AUTH_AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
        resourceId: setup.tokenId,
        context,
        metadata: {
          purpose: PASSWORD_SETUP_PURPOSE.FORGOT_PASSWORD,
          expiresAt: setup.expiresAt.toISOString(),
        },
      });
    }

    return {
      message: AUTH_MESSAGES.FORGOT_PASSWORD_SUCCESS,
    };
  }

  async resetPassword(token: string, password: string, context: RequestContext) {
    const consumed = await passwordSetupService.consumeToken({
      rawToken: token,
      context,
    });

    const currentHash = consumed.user.passwordHash;

    try {
      await passwordHistoryService.assertNotReused(
        consumed.userId,
        password,
        currentHash,
      );
    } catch (error) {
      if (
        error instanceof SecurityError &&
        error.code === SECURITY_ERROR_CODES.PASSWORD_REUSED
      ) {
        throw new AuthError(
          error.message,
          400,
          AUTH_ERROR_CODES.PASSWORD_REUSED,
        );
      }
      throw error;
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    if (currentHash) {
      await passwordHistoryService.recordPasswordChange(
        consumed.userId,
        currentHash,
      );
    }
    await authRepository.updateUserPassword(consumed.userId, passwordHash);
    await sessionService.revokeAllSessions({
      userId: consumed.userId,
      reason: SessionRevokedReason.PASSWORD_CHANGE,
      actorUserId: consumed.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      auditAction: SESSION_AUDIT_ACTIONS.PASSWORD_CHANGED,
      metadata: { flow: "password_setup_or_reset" },
    });

    await passwordPolicyService.completePasswordChange(consumed.userId, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    await passwordSetupService.markCompleted(
      consumed.tokenId,
      consumed.userId,
      context,
      PASSWORD_SETUP_PURPOSE.FORGOT_PASSWORD,
    );

    await logAuthAuditEvent({
      userId: consumed.userId,
      action: AUTH_AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      resourceId: consumed.tokenId,
      context,
    });

    return {
      message: AUTH_MESSAGES.RESET_PASSWORD_SUCCESS,
    };
  }

  async verifyEmail(token: string, context: RequestContext) {
    const tokenHash = hashOpaqueToken(token);
    const storedToken =
      await authRepository.findEmailVerificationTokenByHash(tokenHash);

    if (!storedToken || storedToken.usedAt) {
      throw new AuthError(
        AUTH_MESSAGES.VERIFY_TOKEN_INVALID,
        400,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    if (storedToken.expiresAt < new Date()) {
      throw new AuthError(
        AUTH_MESSAGES.VERIFY_TOKEN_INVALID,
        400,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    if (storedToken.user.deletedAt) {
      throw new AuthError(
        AUTH_MESSAGES.VERIFY_TOKEN_INVALID,
        400,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    if (storedToken.user.emailVerified) {
      await authRepository.markEmailVerificationTokenUsed(storedToken.id);
      return {
        message: AUTH_MESSAGES.VERIFY_EMAIL_SUCCESS,
      };
    }

    await authRepository.verifyUserEmail(storedToken.userId);
    await authRepository.markEmailVerificationTokenUsed(storedToken.id);

    await logAuthAuditEvent({
      userId: storedToken.userId,
      action: AUTH_AUDIT_ACTIONS.EMAIL_VERIFIED,
      resourceId: storedToken.id,
      context,
    });

    return {
      message: AUTH_MESSAGES.VERIFY_EMAIL_SUCCESS,
    };
  }

  async resendVerification(email: string, context: RequestContext) {
    const user = await authRepository.findUserByEmail(email);

    if (user && !user.emailVerified && user.deletedAt === null) {
      try {
        await this.sendVerificationEmailForUser(user, context);
      } catch (error) {
        console.error("[auth] Resend verification email failed:", error);
        const message =
          error instanceof EmailDeliveryError
            ? error.message
            : "Verification email could not be sent. Please try again later.";
        throw new AuthError(
          message,
          502,
          AUTH_ERROR_CODES.EMAIL_DELIVERY_FAILED,
        );
      }
    }

    return {
      message: AUTH_MESSAGES.RESEND_VERIFICATION_SUCCESS,
    };
  }

  async verifyOtp(
    otpSessionId: string,
    code: string,
    context: RequestContext,
  ): Promise<VerifyOtpServiceResult> {
    const otpSession = await authRepository.findOtpVerificationById(otpSessionId);

    if (!otpSession || otpSession.usedAt || otpSession.user.deletedAt) {
      throw new AuthError(
        AUTH_MESSAGES.OTP_INVALID,
        400,
        AUTH_ERROR_CODES.OTP_INVALID,
      );
    }

    if (otpSession.expiresAt < new Date()) {
      throw new AuthError(
        AUTH_MESSAGES.OTP_INVALID,
        400,
        AUTH_ERROR_CODES.OTP_EXPIRED,
      );
    }

    if (otpSession.attempts >= OTP_RULES.MAX_ATTEMPTS) {
      throw new AuthError(
        AUTH_MESSAGES.OTP_INVALID,
        400,
        AUTH_ERROR_CODES.OTP_MAX_ATTEMPTS,
      );
    }

    const userForChallenge = otpSession.user;
    const usesTotp =
      otpSession.purpose === OtpPurpose.LOGIN_2FA &&
      Boolean(userForChallenge.twoFactorSecret);

    let recoveryUsed = false;

    if (usesTotp) {
      const factor = await mfaService.verifyLoginFactor({
        encryptedSecret: userForChallenge.twoFactorSecret as string,
        recoveryCodes: mfaService.parseRecoveryCodes(
          userForChallenge.recoveryCodes,
        ),
        lastStep: userForChallenge.twoFactorLastStep ?? null,
        code,
      });

      if (!factor.ok) {
        await this.handleFailedOtpAttempt(otpSession, context);
        await logAuthAuditEvent({
          userId: userForChallenge.id,
          action: AUTH_AUDIT_ACTIONS.MFA_FAILURE,
          resourceId: otpSession.id,
          metadata: { purpose: OtpPurpose.LOGIN_2FA, method: "totp" },
          context,
        });
        void securityMonitoringService.reportMfaFailure({
          userId: userForChallenge.id,
          resource: "auth",
          resourceId: otpSession.id,
          message: "MFA verification failed",
          metadata: { method: "totp" },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        });
        throw new AuthError(
          AUTH_MESSAGES.OTP_INVALID,
          400,
          AUTH_ERROR_CODES.OTP_INVALID,
        );
      }

      if (factor.method === "totp") {
        await authRepository.updateUserMfa(userForChallenge.id, {
          twoFactorLastStep: factor.step,
        });
      } else {
        recoveryUsed = true;
        await authRepository.updateUserMfa(userForChallenge.id, {
          recoveryCodes: factor.updatedRecoveryCodes as unknown as Prisma.InputJsonValue,
        });
      }
    } else {
      const isValid = verifyOtpCodeHash(code, otpSession.codeHash);

      if (!isValid) {
        await this.handleFailedOtpAttempt(otpSession, context);
        throw new AuthError(
          AUTH_MESSAGES.OTP_INVALID,
          400,
          AUTH_ERROR_CODES.OTP_INVALID,
        );
      }
    }

    await authRepository.markOtpVerificationUsed(otpSession.id);

    if (otpSession.purpose === OtpPurpose.LOGIN_2FA) {
      const user = otpSession.user;
      await this.assertUserCanLogin(user, context);

      const rememberMe = this.consumeRememberMe(otpSessionId);
      const sessionResult = await this.createUserSession(user, context, {
        rememberMe,
        deviceFingerprint: context.deviceFingerprint,
      });

      await authRepository.recordSuccessfulLogin(user.id);

      await logLoginAttempt({
        email: user.email,
        userId: user.id,
        success: true,
        context,
      });

      await logAuthAuditEvent({
        userId: user.id,
        action: AUTH_AUDIT_ACTIONS.OTP_VERIFIED,
        resourceId: otpSession.id,
        metadata: {
          purpose: OtpPurpose.LOGIN_2FA,
          method: usesTotp ? (recoveryUsed ? "recovery" : "totp") : "email",
        },
        context,
      });

      if (usesTotp) {
        await logAuthAuditEvent({
          userId: user.id,
          action: AUTH_AUDIT_ACTIONS.MFA_SUCCESS,
          resourceId: otpSession.id,
          metadata: { method: recoveryUsed ? "recovery" : "totp" },
          context,
        });
      }

      if (recoveryUsed) {
        await logAuthAuditEvent({
          userId: user.id,
          action: AUTH_AUDIT_ACTIONS.MFA_RECOVERY_USED,
          resourceId: otpSession.id,
          context,
        });
      }

      await logAuthAuditEvent({
        userId: user.id,
        action: AUTH_AUDIT_ACTIONS.LOGIN,
        resourceId: sessionResult.sessionId,
        metadata: { method: usesTotp ? "mfa" : "otp" },
        context,
      });

      return {
        purpose: OtpPurpose.LOGIN_2FA,
        user: toSafeUser(user),
        tokens: {
          accessToken: sessionResult.accessToken,
          expiresIn: sessionResult.expiresIn,
          tokenType: "Bearer" as const,
        },
        refreshToken: sessionResult.refreshToken,
      };
    }

    if (otpSession.purpose === OtpPurpose.SENSITIVE_ACTION) {
      await logAuthAuditEvent({
        userId: otpSession.userId,
        action: AUTH_AUDIT_ACTIONS.OTP_VERIFIED,
        resourceId: otpSession.id,
        metadata: { purpose: OtpPurpose.SENSITIVE_ACTION },
        context,
      });

      return {
        purpose: OtpPurpose.SENSITIVE_ACTION,
        verified: true,
        message: AUTH_MESSAGES.SENSITIVE_ACTION_VERIFIED,
      };
    }

    throw new AuthError(
      AUTH_MESSAGES.OTP_INVALID,
      400,
      AUTH_ERROR_CODES.OTP_INVALID,
    );
  }

  async resendOtp(
    otpSessionId: string,
    context: RequestContext,
  ): Promise<OtpChallengeResult> {
    const otpSession = await authRepository.findOtpVerificationById(otpSessionId);

    if (!otpSession || otpSession.usedAt || otpSession.user.deletedAt) {
      throw new AuthError(
        AUTH_MESSAGES.OTP_INVALID,
        400,
        AUTH_ERROR_CODES.OTP_INVALID,
      );
    }

    if (otpSession.expiresAt < new Date()) {
      throw new AuthError(
        AUTH_MESSAGES.OTP_INVALID,
        400,
        AUTH_ERROR_CODES.OTP_EXPIRED,
      );
    }

    const elapsedMs = Date.now() - otpSession.createdAt.getTime();
    if (elapsedMs < OTP_RULES.RESEND_COOLDOWN_SECONDS * 1000) {
      throw new AuthError(
        AUTH_MESSAGES.OTP_RESEND_COOLDOWN,
        429,
        AUTH_ERROR_CODES.RATE_LIMITED,
      );
    }

    if (
      otpSession.purpose === OtpPurpose.LOGIN_2FA &&
      otpSession.user.twoFactorSecret
    ) {
      const challenge = await this.issueTotpChallenge(otpSession.user, context);

      await logAuthAuditEvent({
        userId: otpSession.userId,
        action: AUTH_AUDIT_ACTIONS.OTP_RESENT,
        resourceId: challenge.otpSessionId,
        metadata: {
          previousOtpSessionId: otpSession.id,
          purpose: otpSession.purpose,
          method: "totp",
        },
        context,
      });

      return challenge;
    }

    const challenge = await this.issueOtpChallenge(
      otpSession.user,
      otpSession.purpose as OtpPurpose,
      context,
    );

    await logAuthAuditEvent({
      userId: otpSession.userId,
      action: AUTH_AUDIT_ACTIONS.OTP_RESENT,
      resourceId: challenge.otpSessionId,
      metadata: { previousOtpSessionId: otpSession.id, purpose: otpSession.purpose },
      context,
    });

    return challenge;
  }

  async requestSensitiveActionOtp(
    userId: string,
    context: RequestContext,
  ): Promise<OtpChallengeResult> {
    const user = await authRepository.findUserById(userId);

    if (!user || user.deletedAt) {
      throw new AuthError(
        "User not found",
        404,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    await this.assertUserCanLogin(user, context);

    return this.issueOtpChallenge(user, OtpPurpose.SENSITIVE_ACTION, context);
  }

  async oauthCallback(
    input: {
      provider: OAuthProviderType;
      supabaseAccessToken: string;
      supabaseRefreshToken?: string | null;
      intent?: "login" | "signup";
    },
    context: RequestContext,
  ): Promise<LoginServiceResult> {
    this.assertOAuthConfigured();

    const identity = await verifySupabaseOAuthToken(input);
    let user = await this.resolveOAuthUser(
      identity,
      context,
      input.intent ?? "login",
    );

    user = await this.syncMfaEnrollmentFlag(user);

    if (user.twoFactorEnabled) {
      if (user.twoFactorSecret) {
        const otpChallenge = await this.issueTotpChallenge(user, context);
        return {
          requiresOtp: true,
          otpSessionId: otpChallenge.otpSessionId,
          expiresIn: otpChallenge.expiresIn,
          mfaMethod: "totp",
        };
      }

      const otpChallenge = await this.issueOtpChallenge(
        user,
        OtpPurpose.LOGIN_2FA,
        context,
      );

      return {
        requiresOtp: true,
        otpSessionId: otpChallenge.otpSessionId,
        expiresIn: otpChallenge.expiresIn,
        mfaMethod: "email",
      };
    }

    return this.completeOAuthLogin(user, identity, context, "callback");
  }

  async linkOAuthAccount(
    userId: string,
    input: {
      provider: OAuthProviderType;
      supabaseAccessToken: string;
      supabaseRefreshToken?: string | null;
    },
    context: RequestContext,
  ): Promise<{ message: string; provider: OAuthProviderType }> {
    this.assertOAuthConfigured();

    const currentUser = await authRepository.findUserById(userId);
    if (!currentUser || currentUser.deletedAt) {
      throw new AuthError(
        "User not found",
        404,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const identity = await verifySupabaseOAuthToken(input);
    const provider = identity.provider as OAuthProvider;

    const existingByProvider = await authRepository.findOAuthAccount(
      provider,
      identity.providerAccountId,
    );

    if (existingByProvider && existingByProvider.userId !== userId) {
      throw new AuthError(
        "This OAuth account is already linked to another user",
        409,
        AUTH_ERROR_CODES.OAUTH_ACCOUNT_EXISTS,
      );
    }

    if (
      identity.email !== currentUser.email.toLowerCase() &&
      (await authRepository.emailExists(identity.email))
    ) {
      throw new AuthError(
        "OAuth email belongs to a different account",
        409,
        AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS,
      );
    }

    const alreadyLinked = await authRepository.findOAuthAccountByUserAndProvider(
      userId,
      provider,
    );

    await authRepository.upsertOAuthAccountForUser({
      userId,
      provider,
      providerAccountId: identity.providerAccountId,
      accessToken: identity.accessToken,
      refreshToken: identity.refreshToken,
      expiresAt: identity.expiresAt,
    });

    if (!currentUser.emailVerified) {
      await authRepository.markEmailVerifiedAndActive(userId);
    }

    if (!alreadyLinked && !existingByProvider) {
      await logAuthAuditEvent({
        userId,
        action: AUTH_AUDIT_ACTIONS.OAUTH_LINKED,
        resourceId: userId,
        metadata: { provider: identity.provider },
        context,
      });
    }

    return {
      message: AUTH_MESSAGES.OAUTH_LINKED,
      provider: identity.provider,
    };
  }

  async unlinkOAuthAccount(
    userId: string,
    provider: OAuthProviderType,
    context: RequestContext,
  ): Promise<{ message: string; provider: OAuthProviderType }> {
    const user = await authRepository.findUserById(userId);
    if (!user || user.deletedAt) {
      throw new AuthError(
        "User not found",
        404,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const account = await authRepository.findOAuthAccountByUserAndProvider(
      userId,
      provider as OAuthProvider,
    );

    if (!account) {
      throw new AuthError(
        "OAuth provider is not linked to this account",
        404,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const oauthCount = await authRepository.countOAuthAccounts(userId);
    const hasPassword = Boolean(user.passwordHash);

    if (!hasPassword && oauthCount <= 1) {
      throw new AuthError(
        AUTH_MESSAGES.OAUTH_UNLINK_DENIED,
        400,
        AUTH_ERROR_CODES.OAUTH_UNLINK_DENIED,
      );
    }

    await authRepository.deleteOAuthAccount(account.id);

    await logAuthAuditEvent({
      userId,
      action: AUTH_AUDIT_ACTIONS.OAUTH_UNLINKED,
      resourceId: account.id,
      metadata: { provider },
      context,
    });

    return {
      message: AUTH_MESSAGES.OAUTH_UNLINKED,
      provider,
    };
  }

  async getActiveSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<SessionDto[]> {
    const sessions = await authRepository.listActiveSessions(userId);

    return sessions.map((session) =>
      this.toSessionDto(session, currentSessionId),
    );
  }

  isCurrentSession(sessionId: string, currentSessionId: string): boolean {
    return sessionId === currentSessionId;
  }

  async revokeSession(
    userId: string,
    sessionId: string,
    currentSessionId: string,
    context: RequestContext,
    options: { allowCurrent?: boolean } = {},
  ): Promise<{ message: string }> {
    const session = await authRepository.findSessionForUser(sessionId, userId);

    if (!session || session.revokedAt) {
      throw new AuthError(
        AUTH_MESSAGES.SESSION_NOT_FOUND,
        404,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    if (
      this.isCurrentSession(sessionId, currentSessionId) &&
      !options.allowCurrent
    ) {
      throw new AuthError(
        AUTH_MESSAGES.SESSION_CURRENT_REVOKE_DENIED,
        400,
        AUTH_ERROR_CODES.FORBIDDEN,
      );
    }

    await sessionService.revokeSession({
      sessionId,
      userId,
      reason: SessionRevokedReason.LOGOUT,
      actorUserId: userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      auditAction: SESSION_AUDIT_ACTIONS.REVOKED,
      metadata: {
        isCurrent: this.isCurrentSession(sessionId, currentSessionId),
        flow: "user_revoke_session",
      },
    });

    await logAuthAuditEvent({
      userId,
      action: AUTH_AUDIT_ACTIONS.SESSION_REVOKED,
      resourceId: sessionId,
      metadata: {
        isCurrent: this.isCurrentSession(sessionId, currentSessionId),
      },
      context,
    });

    return { message: "Session revoked successfully" };
  }

  async revokeAllSessions(
    userId: string,
    currentSessionId: string,
    context: RequestContext,
  ): Promise<{ message: string; revokedCount: number }> {
    const revokedCount = await sessionService.revokeAllSessions({
      userId,
      exceptSessionId: currentSessionId,
      reason: SessionRevokedReason.LOGOUT,
      actorUserId: userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      auditAction: SESSION_AUDIT_ACTIONS.REVOKED,
      metadata: { flow: "logout_all_others" },
    });

    await logAuthAuditEvent({
      userId,
      action: AUTH_AUDIT_ACTIONS.SESSION_LOGOUT_ALL,
      resourceId: currentSessionId,
      metadata: { revokedCount },
      context,
    });

    return {
      message: AUTH_MESSAGES.SESSIONS_REVOKED,
      revokedCount,
    };
  }

  async renameSession(
    userId: string,
    sessionId: string,
    deviceName: string,
    currentSessionId: string,
    context: RequestContext,
  ): Promise<{ message: string; session: SessionDto }> {
    const session = await authRepository.findSessionForUser(sessionId, userId);

    if (!session || session.revokedAt) {
      throw new AuthError(
        AUTH_MESSAGES.SESSION_NOT_FOUND,
        404,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const result = await authRepository.renameSession(
      sessionId,
      userId,
      deviceName,
    );

    if (result.count === 0) {
      throw new AuthError(
        AUTH_MESSAGES.SESSION_NOT_FOUND,
        404,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    await logAuthAuditEvent({
      userId,
      action: AUTH_AUDIT_ACTIONS.SESSION_RENAMED,
      resourceId: sessionId,
      metadata: {
        previousName: session.deviceName,
        deviceName,
      },
      context,
    });

    const updated = {
      ...session,
      deviceName,
    };

    return {
      message: AUTH_MESSAGES.SESSION_RENAMED,
      session: this.toSessionDto(updated, currentSessionId),
    };
  }

  async cleanupExpiredSessions(): Promise<{
    idleSessions: number;
    absoluteSessions: number;
    expiredRefreshTokens: number;
    deletedRevokedSessions: number;
    deletedAuditLogs: number;
  }> {
    const now = new Date();
    const revokedBefore = new Date(
      now.getTime() -
        TOKEN_EXPIRATION.REVOKED_SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    const { idleSessions, absoluteSessions } =
      await sessionService.cleanupExpiredSessions();

    const expiredRefreshTokens =
      await authRepository.deleteExpiredRefreshTokens(now);
    const deletedRevokedSessions =
      await authRepository.deleteOldRevokedSessions(revokedBefore);

    let deletedAuditLogs = 0;
    if (TOKEN_EXPIRATION.AUDIT_LOG_RETENTION_DAYS > 0) {
      const auditBefore = new Date(
        now.getTime() -
          TOKEN_EXPIRATION.AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      deletedAuditLogs = await authRepository.deleteOldAuditLogs(auditBefore);
    }

    if (idleSessions > 0 || absoluteSessions > 0) {
      await logAuthAuditEvent({
        action: AUTH_AUDIT_ACTIONS.SESSION_EXPIRED,
        metadata: {
          idleSessions,
          absoluteSessions,
        },
        context: { ipAddress: "system", userAgent: "session-cleanup-job" },
      });
    }

    await logAuthAuditEvent({
      action: AUTH_AUDIT_ACTIONS.SESSION_CLEANUP,
      metadata: {
        idleSessions,
        absoluteSessions,
        expiredRefreshTokens,
        deletedRevokedSessions,
        deletedAuditLogs,
      },
      context: { ipAddress: "system", userAgent: "session-cleanup-job" },
    });

    return {
      idleSessions,
      absoluteSessions,
      expiredRefreshTokens,
      deletedRevokedSessions,
      deletedAuditLogs,
    };
  }

  private toSessionDto(
    session: {
      id: string;
      deviceName: string;
      ipAddress: string;
      userAgent: string;
      lastActiveAt: Date;
      revokedAt: Date | null;
      createdAt: Date;
    },
    currentSessionId: string,
  ): SessionDto {
    const device = parseDeviceInfo(session.userAgent);

    return {
      id: session.id,
      deviceName: session.deviceName || device.deviceName,
      browser: device.browser,
      os: device.os,
      deviceType: device.deviceType,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      country: null,
      status: session.revokedAt ? SessionStatus.REVOKED : SessionStatus.ACTIVE,
      lastActiveAt: session.lastActiveAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      isCurrent: this.isCurrentSession(session.id, currentSessionId),
    };
  }

  private assertOAuthConfigured(): void {
    if (!isSupabaseConfigured()) {
      throw new AuthError(
        "OAuth is not configured on this server",
        503,
        AUTH_ERROR_CODES.INTERNAL_ERROR,
      );
    }
  }

  private assertOAuthSignupEmailAvailable(): never {
    throw new AuthError(
      AUTH_MESSAGES.OAUTH_SIGNUP_EMAIL_EXISTS,
      409,
      AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS,
    );
  }

  private async resolveOAuthUser(
    identity: VerifiedOAuthIdentity,
    context: RequestContext,
    intent: "login" | "signup" = "login",
  ): Promise<UserWithRoleAndPermissions> {
    const provider = identity.provider as OAuthProvider;
    const email = identity.email.trim().toLowerCase();

    const existingOAuth = await authRepository.findOAuthAccount(
      provider,
      identity.providerAccountId,
    );

    if (existingOAuth) {
      if (intent === "signup") {
        this.assertOAuthSignupEmailAvailable();
      }

      if (existingOAuth.user.deletedAt) {
        throw new AuthError(
          "Account has been deactivated",
          403,
          AUTH_ERROR_CODES.ACCOUNT_DEACTIVATED,
        );
      }

      await authRepository.updateOAuthAccountTokens(existingOAuth.id, {
        accessToken: identity.accessToken,
        refreshToken: identity.refreshToken,
        expiresAt: identity.expiresAt,
        providerAccountId: identity.providerAccountId,
      });

      if (!existingOAuth.user.emailVerified) {
        await authRepository.markEmailVerifiedAndActive(existingOAuth.userId);
      }

      await authRepository.updateUserProfileFromOAuth(existingOAuth.userId, {
        avatarUrl: identity.avatarUrl,
      });

      const refreshed = await authRepository.findUserById(existingOAuth.userId);
      if (!refreshed) {
        throw new AuthError(
          "User not found",
          404,
          AUTH_ERROR_CODES.TOKEN_INVALID,
        );
      }

      return refreshed;
    }

    // One email = one account: reuse existing password/OAuth user and link provider.
    const existingByEmail = await authRepository.findUserByEmail(email);

    if (existingByEmail) {
      if (intent === "signup") {
        this.assertOAuthSignupEmailAvailable();
      }

      return this.linkOAuthIdentityToExistingUser(
        existingByEmail,
        { ...identity, email },
        context,
      );
    }

    const clientRole = await authRepository.getDefaultClientRole();
    if (!clientRole) {
      throw new AuthError(
        "Default client role is not configured",
        500,
        AUTH_ERROR_CODES.INTERNAL_ERROR,
      );
    }

    try {
      const created = await authRepository.createUser({
        email,
        passwordHash: null,
        firstName: identity.firstName,
        lastName: identity.lastName,
        roleId: clientRole.id,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        avatarUrl: identity.avatarUrl,
      });

      await authRepository.upsertOAuthAccountForUser({
        userId: created.id,
        provider,
        providerAccountId: identity.providerAccountId,
        accessToken: identity.accessToken,
        refreshToken: identity.refreshToken,
        expiresAt: identity.expiresAt,
      });

      try {
        await ensurePortalCompanyLink(created.id, {
          userId: created.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        });
      } catch (error) {
        console.error(
          "[auth] OAuth signup succeeded but portal company link failed:",
          error,
        );
      }

      // Fire-and-forget: integrity audit must not block new-email OAuth signup.
      scheduleAuthAuditEvent({
        userId: created.id,
        action: AUTH_AUDIT_ACTIONS.OAUTH_SIGNUP,
        resourceId: created.id,
        metadata: { provider: identity.provider, email },
        context,
      });

      const linked = await authRepository.findUserById(created.id);
      return linked ?? created;
    } catch (error) {
      // Concurrent signup/OAuth race: email unique constraint.
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        if (intent === "signup") {
          this.assertOAuthSignupEmailAvailable();
        }

        const racedUser = await authRepository.findUserByEmail(email);
        if (racedUser) {
          return this.linkOAuthIdentityToExistingUser(
            racedUser,
            { ...identity, email },
            context,
          );
        }
      }

      throw error;
    }
  }

  private async linkOAuthIdentityToExistingUser(
    existingUser: UserWithRoleAndPermissions,
    identity: VerifiedOAuthIdentity,
    context: RequestContext,
  ): Promise<UserWithRoleAndPermissions> {
    if (existingUser.deletedAt) {
      throw new AuthError(
        "Account has been deactivated",
        403,
        AUTH_ERROR_CODES.ACCOUNT_DEACTIVATED,
      );
    }

    const provider = identity.provider as OAuthProvider;
    const alreadyLinked =
      await authRepository.findOAuthAccountByUserAndProvider(
        existingUser.id,
        provider,
      );

    // Provider account may already belong to a different app user.
    const providerOwned = await authRepository.findOAuthAccount(
      provider,
      identity.providerAccountId,
    );
    if (providerOwned && providerOwned.userId !== existingUser.id) {
      throw new AuthError(
        "This OAuth account is already linked to another user",
        409,
        AUTH_ERROR_CODES.OAUTH_ACCOUNT_EXISTS,
      );
    }

    await authRepository.upsertOAuthAccountForUser({
      userId: existingUser.id,
      provider,
      providerAccountId: identity.providerAccountId,
      accessToken: identity.accessToken,
      refreshToken: identity.refreshToken,
      expiresAt: identity.expiresAt,
    });

    if (!alreadyLinked) {
      scheduleAuthAuditEvent({
        userId: existingUser.id,
        action: AUTH_AUDIT_ACTIONS.OAUTH_LINKED,
        resourceId: existingUser.id,
        metadata: { provider: identity.provider, via: "oauth_callback" },
        context,
      });
    }

    if (!existingUser.emailVerified) {
      await authRepository.markEmailVerifiedAndActive(existingUser.id);
    }

    await authRepository.updateUserProfileFromOAuth(existingUser.id, {
      avatarUrl: identity.avatarUrl,
    });

    const refreshed = await authRepository.findUserById(existingUser.id);
    if (!refreshed) {
      throw new AuthError(
        "User not found",
        404,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    return refreshed;
  }

  private async completeOAuthLogin(
    user: UserWithRoleAndPermissions,
    identity: VerifiedOAuthIdentity,
    context: RequestContext,
    source: "callback",
  ): Promise<LoginSessionResult> {
    await this.assertUserCanLogin(user, context);

    // Self-serve OAuth accounts created before portal linking (or whose link
    // failed) stay unlinked forever unless we retry here. Email-match only —
    // never invent a Client CRM row on login.
    let portalUser = user;
    if (user.role.code === UserRole.CLIENT && !user.companyId) {
      try {
        await ensurePortalCompanyLink(
          user.id,
          {
            userId: user.id,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
          },
          { createIfMissing: false },
        );
        const refreshed = await authRepository.findUserById(user.id);
        if (refreshed) {
          portalUser = refreshed;
        }
      } catch (error) {
        console.error(
          "[auth] OAuth login portal company email-link retry failed:",
          error,
        );
      }
    }

    const sessionResult = await this.createUserSession(portalUser, context, {
      deviceFingerprint: context.deviceFingerprint,
    });

    await authRepository.recordSuccessfulLogin(portalUser.id);

    await logLoginAttempt({
      email: portalUser.email,
      userId: portalUser.id,
      success: true,
      context,
    });

    // Do not await integrity-chained audit writes on the OAuth hot path —
    // advisory-lock transactions were starving the Supabase pooler and
    // returning opaque 500 "An unexpected error occurred" to the browser.
    scheduleAuthAuditEvent({
      userId: portalUser.id,
      action: AUTH_AUDIT_ACTIONS.OAUTH_LOGIN,
      resourceId: sessionResult.sessionId,
      metadata: { provider: identity.provider, source },
      context,
    });

    scheduleAuthAuditEvent({
      userId: portalUser.id,
      action: AUTH_AUDIT_ACTIONS.LOGIN,
      resourceId: sessionResult.sessionId,
      metadata: { method: "oauth", provider: identity.provider },
      context,
    });

    return {
      user: toSafeUser(portalUser),
      tokens: {
        accessToken: sessionResult.accessToken,
        expiresIn: sessionResult.expiresIn,
        tokenType: "Bearer" as const,
      },
      refreshToken: sessionResult.refreshToken,
    };
  }

  private async issueTotpChallenge(
    user: Pick<UserWithRoleAndPermissions, "id">,
    context: RequestContext,
  ): Promise<OtpChallengeResult> {
    const placeholder = generateOtpCode();
    const codeHash = hashOtpCode(`totp:${placeholder}:${Date.now()}`);
    const expiresAt = getOtpExpiresAt(OtpPurpose.LOGIN_2FA);

    await authRepository.invalidateOtpVerifications(
      user.id,
      OtpPurpose.LOGIN_2FA,
    );

    const otpSession = await authRepository.createOtpVerification({
      userId: user.id,
      codeHash,
      purpose: OtpPurpose.LOGIN_2FA,
      expiresAt,
    });

    await logAuthAuditEvent({
      userId: user.id,
      action: AUTH_AUDIT_ACTIONS.OTP_SENT,
      resourceId: otpSession.id,
      metadata: { purpose: OtpPurpose.LOGIN_2FA, method: "totp" },
      context,
    });

    return {
      otpSessionId: otpSession.id,
      expiresIn: getOtpExpiresInSeconds(OtpPurpose.LOGIN_2FA),
    };
  }

  private async syncMfaEnrollmentFlag(
    user: UserWithRoleAndPermissions,
  ): Promise<UserWithRoleAndPermissions> {
    const roleCode = user.role.code;
    const mandatory = isMfaMandatoryRole(roleCode);
    const shouldRequire = mandatory && !user.twoFactorEnabled;
    const current = Boolean(user.mfaEnrollmentRequired);

    if (shouldRequire === current) {
      return user;
    }

    await authRepository.updateUserMfa(user.id, {
      mfaEnrollmentRequired: shouldRequire,
    });

    return { ...user, mfaEnrollmentRequired: shouldRequire };
  }

  async getMfaStatus(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user || user.deletedAt) {
      throw new AuthError(
        "User not found",
        404,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const recoveryCodes = mfaService.parseRecoveryCodes(user.recoveryCodes);
    const remaining = recoveryCodes.filter((entry) => !entry.usedAt).length;

    return {
      enabled: Boolean(user.twoFactorEnabled && user.twoFactorSecret),
      enrollmentRequired: Boolean(user.mfaEnrollmentRequired),
      canEnroll: isMfaOptionalRole(user.role.code),
      recoveryCodesRemaining: user.twoFactorEnabled ? remaining : undefined,
    };
  }

  async setupMfa(userId: string, context: RequestContext) {
    const user = await authRepository.findUserById(userId);
    if (!user || user.deletedAt) {
      throw new AuthError(
        "User not found",
        404,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    if (!isMfaOptionalRole(user.role.code)) {
      throw new AuthError(
        AUTH_MESSAGES.MFA_NOT_AVAILABLE,
        403,
        AUTH_ERROR_CODES.FORBIDDEN,
      );
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      throw new AuthError(
        AUTH_MESSAGES.MFA_ALREADY_ENABLED,
        409,
        AUTH_ERROR_CODES.VALIDATION_ERROR,
      );
    }

    const setup = await mfaService.beginSetup(user.id, user.email);

    await logAuthAuditEvent({
      userId: user.id,
      action: AUTH_AUDIT_ACTIONS.OTP_SENT,
      resourceId: user.id,
      metadata: { purpose: "mfa_setup" },
      context,
    });

    return setup;
  }

  async enableMfa(
    userId: string,
    code: string,
    context: RequestContext,
    currentSessionId?: string,
  ): Promise<{ message: string }> {
    const user = await authRepository.findUserById(userId);
    if (!user || user.deletedAt) {
      throw new AuthError(
        "User not found",
        404,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    if (!isMfaOptionalRole(user.role.code)) {
      throw new AuthError(
        AUTH_MESSAGES.MFA_NOT_AVAILABLE,
        403,
        AUTH_ERROR_CODES.FORBIDDEN,
      );
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      throw new AuthError(
        AUTH_MESSAGES.MFA_ALREADY_ENABLED,
        409,
        AUTH_ERROR_CODES.VALIDATION_ERROR,
      );
    }

    let enabled: {
      encryptedSecret: string;
      recoveryCodes: ReturnType<typeof mfaService.parseRecoveryCodes>;
    };

    try {
      enabled = await mfaService.enableMFA(userId, code);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      await logAuthAuditEvent({
        userId,
        action: AUTH_AUDIT_ACTIONS.MFA_FAILURE,
        resourceId: userId,
        metadata: { action: "enable" },
        context,
      });

      if (message === "MFA_SETUP_EXPIRED") {
        throw new AuthError(
          AUTH_MESSAGES.MFA_SETUP_EXPIRED,
          400,
          AUTH_ERROR_CODES.OTP_EXPIRED,
        );
      }

      throw new AuthError(
        AUTH_MESSAGES.OTP_INVALID,
        400,
        AUTH_ERROR_CODES.OTP_INVALID,
      );
    }

    await authRepository.updateUserMfa(userId, {
      twoFactorEnabled: true,
      twoFactorSecret: enabled.encryptedSecret,
      recoveryCodes: enabled.recoveryCodes as unknown as Prisma.InputJsonValue,
      twoFactorLastStep: null,
      mfaEnrollmentRequired: false,
    });

    // MFA state change — revoke other sessions + rebind current (hardening)
    await sessionHardeningService.rotateAfterMfaEnable({
      userId,
      currentSessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    await logAuthAuditEvent({
      userId,
      action: AUTH_AUDIT_ACTIONS.MFA_ENABLED,
      resourceId: userId,
      context,
    });

    return { message: AUTH_MESSAGES.MFA_ENABLED };
  }

  async disableMfa(
    userId: string,
    code: string,
    context: RequestContext,
    currentSessionId?: string,
  ): Promise<{ message: string }> {
    const user = await authRepository.findUserById(userId);
    if (!user || user.deletedAt) {
      throw new AuthError(
        "User not found",
        404,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new AuthError(
        AUTH_MESSAGES.MFA_NOT_ENABLED,
        400,
        AUTH_ERROR_CODES.VALIDATION_ERROR,
      );
    }

    const verified = await mfaService.verifyForDisable({
      encryptedSecret: user.twoFactorSecret,
      recoveryCodes: mfaService.parseRecoveryCodes(user.recoveryCodes),
      lastStep: user.twoFactorLastStep ?? null,
      code,
    });

    if (!verified.ok) {
      await logAuthAuditEvent({
        userId,
        action: AUTH_AUDIT_ACTIONS.MFA_FAILURE,
        resourceId: userId,
        metadata: { action: "disable" },
        context,
      });
      throw new AuthError(
        AUTH_MESSAGES.OTP_INVALID,
        400,
        AUTH_ERROR_CODES.OTP_INVALID,
      );
    }

    const enrollmentRequired = isMfaMandatoryRole(user.role.code);
    const cleared = mfaService.disableMFA(userId);

    await authRepository.updateUserMfa(userId, {
      ...cleared,
      mfaEnrollmentRequired: enrollmentRequired,
    });

    // MFA reset — invalidate all sessions (including current) to force re-auth
    await sessionHardeningService.rotateAfterMfaDisable({
      userId,
      currentSessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    await logAuthAuditEvent({
      userId,
      action: AUTH_AUDIT_ACTIONS.MFA_DISABLED,
      resourceId: userId,
      metadata: { method: verified.method },
      context,
    });

    return { message: AUTH_MESSAGES.MFA_DISABLED };
  }

  private async issueOtpChallenge(
    user: Pick<UserWithRoleAndPermissions, "id" | "email" | "firstName">,
    purpose: OtpPurpose,
    context: RequestContext,
  ): Promise<OtpChallengeResult> {
    const code = generateOtpCode();
    const codeHash = hashOtpCode(code);
    const expiresAt = getOtpExpiresAt(purpose);
    const expiresInMinutes =
      purpose === OtpPurpose.SENSITIVE_ACTION
        ? OTP_RULES.EXPIRY_MINUTES_SENSITIVE
        : OTP_RULES.EXPIRY_MINUTES_LOGIN;

    await authRepository.invalidateOtpVerifications(user.id, purpose);

    const otpSession = await authRepository.createOtpVerification({
      userId: user.id,
      codeHash,
      purpose,
      expiresAt,
    });

    try {
      await emailService.sendOtpEmail({
        to: user.email,
        firstName: user.firstName,
        code,
        purposeLabel: this.getOtpPurposeLabel(purpose),
        expiresInMinutes,
      });
    } catch (error) {
      console.error("[auth] OTP email failed:", error);

      const deliveryMessage =
        error instanceof EmailDeliveryError
          ? error.message
          : "Verification code email could not be sent. Please try again later.";
      const resendTestingMode =
        /testing mode/i.test(deliveryMessage) ||
        /only send to the account owner's address/i.test(deliveryMessage);

      // Never fall through to password-only login when OTP is required.
      // For Resend "testing mode" (unverified domain), still return the OTP
      // challenge and log the code so operators can complete login / fix EMAIL_FROM.
      // Hard-fail other production delivery errors so users are not left with
      // an unreachable OTP session and no recovery path.
      if (process.env.NODE_ENV === "production" && !resendTestingMode) {
        throw new AuthError(
          deliveryMessage,
          502,
          AUTH_ERROR_CODES.EMAIL_DELIVERY_FAILED,
        );
      }

      console.warn(
        `[auth] OTP challenge created without email delivery` +
          `${resendTestingMode ? " (Resend testing mode)" : " (dev)"}.\n` +
          `  email: ${user.email}\n` +
          `  purpose: ${purpose}\n` +
          `  code: ${code}\n` +
          `  otpSessionId: ${otpSession.id}`,
      );
    }

    await logAuthAuditEvent({
      userId: user.id,
      action: AUTH_AUDIT_ACTIONS.OTP_SENT,
      resourceId: otpSession.id,
      metadata: { purpose },
      context,
    });

    return {
      otpSessionId: otpSession.id,
      expiresIn: getOtpExpiresInSeconds(purpose),
    };
  }

  private async handleFailedOtpAttempt(
    otpSession: NonNullable<Awaited<ReturnType<typeof authRepository.findOtpVerificationById>>>,
    context: RequestContext,
  ): Promise<void> {
    const nextAttempts = otpSession.attempts + 1;

    await authRepository.incrementOtpAttempts(otpSession.id, nextAttempts);

    await logAuthAuditEvent({
      userId: otpSession.userId,
      action: AUTH_AUDIT_ACTIONS.OTP_FAILED,
      resourceId: otpSession.id,
      metadata: {
        purpose: otpSession.purpose,
        attempts: nextAttempts,
      },
      context,
    });

    if (nextAttempts < OTP_RULES.MAX_ATTEMPTS) {
      return;
    }

    await authRepository.markOtpVerificationUsed(otpSession.id);

    const lockedUntil = new Date(
      Date.now() + TOKEN_EXPIRATION.ACCOUNT_LOCKOUT_MINUTES * 60 * 1000,
    );

    await authRepository.recordFailedLogin(
      otpSession.userId,
      OTP_RULES.MAX_ATTEMPTS,
      lockedUntil,
    );

    await logAuthAuditEvent({
      userId: otpSession.userId,
      action: AUTH_AUDIT_ACTIONS.ACCOUNT_LOCKED,
      resourceId: otpSession.userId,
      metadata: { reason: "otp_abuse", attempts: nextAttempts },
      context,
    });
  }

  private getOtpPurposeLabel(purpose: OtpPurpose): string {
    switch (purpose) {
      case OtpPurpose.LOGIN_2FA:
        return "sign in";
      case OtpPurpose.SENSITIVE_ACTION:
        return "security verification";
      case OtpPurpose.PASSWORD_RESET:
        return "password reset";
      default: {
        const exhaustiveCheck: never = purpose;
        return exhaustiveCheck;
      }
    }
  }

  private async sendVerificationEmailForUser(
    user: Pick<UserWithRoleAndPermissions, "id" | "email" | "firstName" | "emailVerified">,
    context: RequestContext,
  ): Promise<void> {
    if (user.emailVerified) {
      return;
    }

    const opaqueToken = generateOpaqueRefreshToken();
    const tokenHash = hashOpaqueToken(opaqueToken);
    const expiresAt = getEmailVerificationExpiresAt();

    await authRepository.invalidateEmailVerificationTokens(user.id);
    const verificationToken = await authRepository.createEmailVerificationToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await emailService.sendVerificationEmail({
      to: user.email,
      firstName: user.firstName,
      verifyUrl: buildEmailVerificationUrl(opaqueToken),
    });

    await logAuthAuditEvent({
      userId: user.id,
      action: AUTH_AUDIT_ACTIONS.VERIFICATION_EMAIL_SENT,
      resourceId: verificationToken.id,
      context,
    });
  }

  private async assertUserCanLogin(
    user: UserWithRoleAndPermissions,
    context: RequestContext,
  ): Promise<void> {
    if (user.status === UserStatus.DEACTIVATED) {
      await logLoginAttempt({
        email: user.email,
        userId: user.id,
        success: false,
        failureReason: LOGIN_FAILURE_REASONS.ACCOUNT_DEACTIVATED,
        context,
      });

      throw new AuthError(
        "Account has been deactivated",
        403,
        AUTH_ERROR_CODES.ACCOUNT_DEACTIVATED,
      );
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AuthError(
        "Account is temporarily locked. Please try again later.",
        403,
        AUTH_ERROR_CODES.ACCOUNT_LOCKED,
      );
    }

    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await authRepository.clearAccountLock(user.id);
      user.failedLoginCount = 0;
      user.lockedUntil = null;
    }

    if (!user.emailVerified) {
      await logLoginAttempt({
        email: user.email,
        userId: user.id,
        success: false,
        failureReason: LOGIN_FAILURE_REASONS.EMAIL_NOT_VERIFIED,
        context,
      });

      throw new AuthError(
        "Email verification required",
        403,
        AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED,
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AuthError(
        "Account is not active",
        403,
        AUTH_ERROR_CODES.ACCOUNT_DEACTIVATED,
      );
    }
  }

  private async verifyPassword(
    user: UserWithRoleAndPermissions,
    password: string,
    context: RequestContext,
  ): Promise<boolean> {
    if (!user.passwordHash) {
      await logLoginAttempt({
        email: user.email,
        userId: user.id,
        success: false,
        failureReason: LOGIN_FAILURE_REASONS.NO_PASSWORD,
        context,
      });
      return false;
    }

    return argon2.verify(user.passwordHash, password);
  }

  private async handleFailedLogin(
    user: UserWithRoleAndPermissions,
    context: RequestContext,
  ): Promise<void> {
    const nextFailedCount = user.failedLoginCount + 1;
    let lockedUntil: Date | null = null;

    if (nextFailedCount >= TOKEN_EXPIRATION.MAX_FAILED_LOGIN_ATTEMPTS) {
      lockedUntil = new Date(
        Date.now() + TOKEN_EXPIRATION.ACCOUNT_LOCKOUT_MINUTES * 60 * 1000,
      );

      await logAuthAuditEvent({
        userId: user.id,
        action: AUTH_AUDIT_ACTIONS.ACCOUNT_LOCKED,
        resourceId: user.id,
        metadata: { failedLoginCount: nextFailedCount },
        context,
      });

      await securityRepository.createSecurityEvent({
        userId: user.id,
        severity: "HIGH",
        category: "ACCOUNT",
        eventType: "account_locked",
        message: `Account locked after ${nextFailedCount} failed login attempts`,
        metadata: { failedLoginCount: nextFailedCount },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    }

    await authRepository.recordFailedLogin(user.id, nextFailedCount, lockedUntil);

    await logLoginAttempt({
      email: user.email,
      userId: user.id,
      success: false,
      failureReason: LOGIN_FAILURE_REASONS.INVALID_CREDENTIALS,
      context,
    });

    await logAuthAuditEvent({
      userId: user.id,
      action: AUTH_AUDIT_ACTIONS.FAILED_LOGIN,
      resourceId: user.id,
      context,
    });

    void securityMonitoringService.reportFailedLogin({
      userId: user.id,
      resource: "auth",
      resourceId: user.id,
      message: "Failed login attempt",
      metadata: { failedLoginCount: nextFailedCount, locked: Boolean(lockedUntil) },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  private async handleRefreshTokenReuse(
    sessionId: string,
    userId: string,
    context: RequestContext,
  ): Promise<void> {
    await authRepository.revokeSession(sessionId, SessionRevokedReason.REUSE_DETECTED);
    await authRepository.revokeAllSessionTokens(sessionId);

    await logAuthAuditEvent({
      userId,
      action: AUTH_AUDIT_ACTIONS.TOKEN_REUSE_DETECTED,
      resourceId: sessionId,
      context,
    });

    void securityMonitoringService.reportSessionAnomaly({
      userId,
      resource: "session",
      resourceId: sessionId,
      message: "Refresh token reuse detected",
      metadata: { reason: "token_reuse" },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  private async createUserSession(
    user: UserWithRoleAndPermissions,
    context: RequestContext,
    options?: { rememberMe?: boolean; deviceFingerprint?: string | null },
  ): Promise<AuthSessionResult> {
    const rememberMe = Boolean(options?.rememberMe);

    const created = await sessionService.createSession({
      userId: user.id,
      deviceName: parseDeviceName(context.userAgent),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceFingerprint: options?.deviceFingerprint,
      rememberMe,
    });

    // Remember-me + fingerprint → trusted device (never bypasses auth).
    if (rememberMe && options?.deviceFingerprint) {
      void sessionHardeningService.rememberDevice({
        userId: user.id,
        deviceFingerprint: options.deviceFingerprint,
        label: parseDeviceName(context.userAgent),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    }

    // Device Management — register after SessionService creates the session.
    void deviceManagementService.registerDevice({
      userId: user.id,
      deviceFingerprint: options?.deviceFingerprint,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      sessionId: created.sessionId,
      label: parseDeviceName(context.userAgent),
    });

    const opaqueRefreshToken = generateOpaqueRefreshToken();
    const tokenHash = hashRefreshToken(opaqueRefreshToken);
    const expiresAt = sessionService.getRefreshTokenExpiresAt(rememberMe);

    await authRepository.createRefreshToken({
      tokenHash,
      sessionId: created.sessionId,
      userId: user.id,
      expiresAt,
    });

    await logAuthAuditEvent({
      userId: user.id,
      action: AUTH_AUDIT_ACTIONS.SESSION_CREATED,
      resourceId: created.sessionId,
      metadata: {
        deviceName: parseDeviceName(context.userAgent),
        ipAddress: context.ipAddress,
        rememberMe,
        expiresAt: created.expiresAt.toISOString(),
      },
      context,
    });

    const permissions = user.role.rolePermissions.map((rp) => rp.permission.key);
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role.code as UserRole,
      permissions,
      sessionId: created.sessionId,
    });

    return {
      accessToken,
      refreshToken: opaqueRefreshToken,
      expiresIn: getAccessTokenExpiresIn(),
      sessionId: created.sessionId,
    };
  }
}

export const authService = new AuthService();
