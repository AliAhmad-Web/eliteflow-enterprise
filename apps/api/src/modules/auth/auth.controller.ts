import type { Request, Response } from "express";

import type {
  ForgotPasswordInput,
  LoginInput,
  OAuthCallbackInput,
  OAuthLinkInput,
  OAuthUnlinkInput,
  RenameSessionInput,
  RenameSessionParamsInput,
  ResendOtpInput,
  ResendVerificationInput,
  ResetPasswordApiInput,
  RevokeSessionParamsInput,
  SignupInput,
  VerifyEmailInput,
  VerifyEmailQueryInput,
  VerifyOtpInput,
} from "@enterprise/shared";
import { OtpPurpose } from "@enterprise/shared";
import { AUTH_ERROR_CODES } from "@enterprise/shared";

import { emailConfig } from "../../config/email.config.js";
import {
  csrfService,
  isCsrfRotateOnRefresh,
} from "../../shared/security/csrf/index.js";
import { zeroTrustService } from "../../shared/security/zero-trust/index.js";
import { successResponse } from "../../shared/utils/api-response.js";
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from "./auth.cookies.js";
import { AuthError } from "./auth.errors.js";
import { authService } from "./auth.service.js";
import { verifyAccessToken } from "./auth.tokens.js";
import { extractRequestContext } from "./auth.utils.js";

async function rotateCsrfForAccessToken(
  req: Request,
  res: Response,
  accessToken: string,
): Promise<void> {
  try {
    const payload = verifyAccessToken(accessToken);
    await csrfService.rotate(req, res, {
      sessionId: payload.sessionId,
      userId: payload.sub,
      tenantId: null,
    });
  } catch {
    await csrfService.rotate(req, res, {
      sessionId: null,
      userId: null,
      tenantId: null,
    });
  }
}

export class AuthController {
  async signup(req: Request, res: Response): Promise<void> {
    const body = req.body as SignupInput;
    const context = extractRequestContext(req);

    const result = await authService.signup(
      {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        password: body.password,
      },
      context,
    );

    res.status(201).json(successResponse(result, "Account created successfully"));
  }

  async login(req: Request, res: Response): Promise<void> {
    const body = req.body as LoginInput;
    const context = extractRequestContext(req);

    const result = await authService.login(body, context);

    if (result.requiresOtp) {
      res.json(
        successResponse(
          {
            requiresOtp: true,
            otpSessionId: result.otpSessionId,
            expiresIn: result.expiresIn,
            mfaMethod: result.mfaMethod,
          },
          result.mfaMethod === "totp"
            ? "Authenticator verification required"
            : "OTP verification required",
        ),
      );
      return;
    }

    setRefreshTokenCookie(res, result.refreshToken);

    await rotateCsrfForAccessToken(req, res, result.tokens.accessToken);

    res.json(
      successResponse(
        {
          user: result.user,
          tokens: result.tokens,
        },
        "Login successful",
      ),
    );
  }

  async logout(req: Request, res: Response): Promise<void> {
    const context = extractRequestContext(req);

    if (!req.auth) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    await authService.logout(req.auth.sessionId, req.auth.userId, context);
    clearRefreshTokenCookie(res);
    await csrfService.clear(req, res);

    res.json(successResponse({ message: "Logged out successfully" }, "Logout successful"));
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const context = extractRequestContext(req);
    const refreshToken = getRefreshTokenFromRequest(req);

    if (!refreshToken) {
      throw new AuthError(
        "Refresh token is required",
        401,
        AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID,
      );
    }

    const result = await authService.refresh(refreshToken, context);

    // Grace-period concurrent refresh returns accessToken only — keep the
    // cookie already set by the winning rotation request.
    if (result.refreshToken) {
      setRefreshTokenCookie(res, result.refreshToken);
    }

    if (isCsrfRotateOnRefresh()) {
      await rotateCsrfForAccessToken(req, res, result.accessToken);
    }

    res.json(
      successResponse(
        {
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
        },
        "Token refreshed successfully",
      ),
    );
  }

  async me(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const user = await authService.getCurrentUser(req.auth.userId);

    res.json(successResponse({ user }, "User retrieved successfully"));
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    const body = req.body as ForgotPasswordInput;
    const context = extractRequestContext(req);

    const result = await authService.forgotPassword(body.email, context);

    res.json(successResponse(result, "Password reset email processed"));
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    const body = req.body as ResetPasswordApiInput;
    const context = extractRequestContext(req);

    const result = await authService.resetPassword(
      body.token,
      body.password,
      context,
    );

    await csrfService.clear(req, res);

    res.json(successResponse(result, "Password reset successful"));
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const body = req.body as VerifyEmailInput;
    const context = extractRequestContext(req);

    const result = await authService.verifyEmail(body.token, context);

    res.json(successResponse(result, "Email verified successfully"));
  }

  async verifyEmailRedirect(req: Request, res: Response): Promise<void> {
    const query = req.query as VerifyEmailQueryInput;
    const context = extractRequestContext(req);

    try {
      await authService.verifyEmail(query.token, context);
      res.redirect(`${emailConfig.frontendUrl}/login?verified=1`);
    } catch {
      res.redirect(`${emailConfig.frontendUrl}/login?verified=0`);
    }
  }

  async resendVerification(req: Request, res: Response): Promise<void> {
    const body = req.body as ResendVerificationInput;
    const context = extractRequestContext(req);

    const result = await authService.resendVerification(body.email, context);

    res.json(successResponse(result, "Verification email processed"));
  }

  async verifyOtp(req: Request, res: Response): Promise<void> {
    const body = req.body as VerifyOtpInput;
    const context = extractRequestContext(req);

    const result = await authService.verifyOtp(
      body.otpSessionId,
      body.code,
      context,
    );

    if (result.purpose === OtpPurpose.LOGIN_2FA) {
      setRefreshTokenCookie(res, result.refreshToken);

      await rotateCsrfForAccessToken(req, res, result.tokens.accessToken);

      res.json(
        successResponse(
          {
            user: result.user,
            tokens: result.tokens,
          },
          "OTP verified successfully",
        ),
      );
      return;
    }

    res.json(
      successResponse(
        {
          verified: result.verified,
          message: result.message,
        },
        "OTP verified successfully",
      ),
    );
  }

  async resendOtp(req: Request, res: Response): Promise<void> {
    const body = req.body as ResendOtpInput;
    const context = extractRequestContext(req);

    const result = await authService.resendOtp(body.otpSessionId, context);

    res.json(
      successResponse(
        {
          otpSessionId: result.otpSessionId,
          expiresIn: result.expiresIn,
        },
        "OTP resent successfully",
      ),
    );
  }

  async oauthCallback(req: Request, res: Response): Promise<void> {
    const body = req.body as OAuthCallbackInput;
    const context = extractRequestContext(req);

    const result = await authService.oauthCallback(
      {
        provider: body.provider,
        supabaseAccessToken: body.supabaseAccessToken,
        supabaseRefreshToken: body.supabaseRefreshToken,
        intent: body.intent,
      },
      context,
    );

    if (result.requiresOtp) {
      res.json(
        successResponse(
          {
            requiresOtp: true,
            otpSessionId: result.otpSessionId,
            expiresIn: result.expiresIn,
            mfaMethod: result.mfaMethod,
          },
          result.mfaMethod === "totp"
            ? "Authenticator verification required"
            : "OTP verification required",
        ),
      );
      return;
    }

    setRefreshTokenCookie(res, result.refreshToken);

    await rotateCsrfForAccessToken(req, res, result.tokens.accessToken);

    res.json(
      successResponse(
        {
          user: result.user,
          tokens: result.tokens,
        },
        "OAuth login successful",
      ),
    );
  }

  async oauthLink(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const body = req.body as OAuthLinkInput;
    const context = extractRequestContext(req);

    const result = await authService.linkOAuthAccount(
      req.auth.userId,
      {
        provider: body.provider,
        supabaseAccessToken: body.supabaseAccessToken,
      },
      context,
    );

    res.json(successResponse(result, "OAuth provider linked"));
  }

  async oauthUnlink(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const body = req.body as OAuthUnlinkInput;
    const context = extractRequestContext(req);

    const result = await authService.unlinkOAuthAccount(
      req.auth.userId,
      body.provider,
      context,
    );

    res.json(successResponse(result, "OAuth provider unlinked"));
  }

  async listSessions(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const sessions = await authService.getActiveSessions(
      req.auth.userId,
      req.auth.sessionId,
    );

    res.json(
      successResponse({ sessions }, "Active sessions retrieved successfully"),
    );
  }

  async revokeSession(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const params = req.params as RevokeSessionParamsInput;
    const context = extractRequestContext(req);

    const result = await authService.revokeSession(
      req.auth.userId,
      params.sessionId,
      req.auth.sessionId,
      context,
    );

    res.json(successResponse(result, "Session revoked successfully"));
  }

  async revokeOtherSessions(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const context = extractRequestContext(req);

    const result = await authService.revokeAllSessions(
      req.auth.userId,
      req.auth.sessionId,
      context,
    );

    res.json(successResponse(result, "Other sessions revoked successfully"));
  }

  async renameSession(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const params = req.params as RenameSessionParamsInput;
    const body = req.body as RenameSessionInput;
    const context = extractRequestContext(req);

    const result = await authService.renameSession(
      req.auth.userId,
      params.sessionId,
      body.deviceName,
      req.auth.sessionId,
      context,
    );

    res.json(successResponse(result, "Device renamed successfully"));
  }

  async mfaStatus(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const result = await authService.getMfaStatus(req.auth.userId);
    res.json(successResponse(result, "MFA status retrieved"));
  }

  async mfaSetup(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const context = extractRequestContext(req);
    const result = await authService.setupMfa(req.auth.userId, context);
    res.json(
      successResponse(result, "Scan the QR code with your authenticator app"),
    );
  }

  async mfaEnable(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const body = req.body as { code: string };
    const context = extractRequestContext(req);
    const result = await authService.enableMfa(
      req.auth.userId,
      body.code,
      context,
      req.auth.sessionId,
    );
    res.json(successResponse(result, result.message));
  }

  async mfaDisable(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const body = req.body as { code: string };
    const context = extractRequestContext(req);
    const result = await authService.disableMfa(
      req.auth.userId,
      body.code,
      context,
      req.auth.sessionId,
    );
    res.json(successResponse(result, result.message));
  }

  /**
   * Zero Trust step-up MFA — reuses existing TOTP/recovery verification.
   */
  async mfaStepUp(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const body = req.body as { code: string };
    const context = extractRequestContext(req);

    try {
      const result = await zeroTrustService.completeStepUp({
        actor: {
          userId: req.auth.userId,
          email: req.auth.email,
          role: req.auth.role,
          permissions: req.auth.permissions,
          sessionId: req.auth.sessionId,
        },
        code: body.code,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      res.json(
        successResponse(
          {
            verified: result.verified,
            expiresAt: result.expiresAt,
            requiresStepUp: false as const,
          },
          "Step-up MFA verified",
        ),
      );
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: string }).code)
          : "MFA_INVALID";

      if (code === "MFA_NOT_ENABLED") {
        throw new AuthError(
          "Multi-factor authentication is not enabled",
          400,
          AUTH_ERROR_CODES.VALIDATION_ERROR,
        );
      }

      throw new AuthError(
        "Invalid verification code",
        400,
        AUTH_ERROR_CODES.OTP_INVALID,
      );
    }
  }
}

export const authController = new AuthController();
