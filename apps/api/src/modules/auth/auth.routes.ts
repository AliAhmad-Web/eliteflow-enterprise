import { Router } from "express";

import { RATE_LIMIT, RECAPTCHA, changePasswordSchema } from "@enterprise/shared";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRecaptcha } from "../../middleware/recaptcha.middleware.js";
import {
  rateLimit,
  rateLimitByIp,
  rateLimitByIpAndEmail,
  rateLimitByOtpSession,
  rateLimitByUser,
} from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { securityController } from "../security/security.controller.js";
import { authController } from "./auth.controller.js";
import {
  forgotPasswordSchema,
  loginSchema,
  mfaDisableSchema,
  mfaEnableSchema,
  mfaStepUpSchema,
  oauthCallbackSchema,
  oauthLinkSchema,
  oauthUnlinkSchema,
  refreshTokenSchema,
  renameSessionParamsSchema,
  renameSessionSchema,
  resendVerificationSchema,
  resetPasswordApiSchema,
  revokeSessionParamsSchema,
  signupSchema,
  verifyEmailQuerySchema,
  verifyEmailSchema,
  verifyOtpSchema,
  resendOtpSchema,
} from "./auth.validation.js";

const authRouter = Router();

authRouter.post(
  "/signup",
  rateLimit({
    name: "auth.signup",
    ...RATE_LIMIT.SIGNUP,
    keyGenerator: rateLimitByIpAndEmail("email"),
  }),
  requireRecaptcha(RECAPTCHA.ACTIONS.SIGNUP),
  validate(signupSchema),
  asyncHandler((req, res) => authController.signup(req, res)),
);

authRouter.post(
  "/login",
  rateLimit({
    name: "auth.login",
    ...RATE_LIMIT.LOGIN,
    keyGenerator: rateLimitByIpAndEmail("email"),
  }),
  requireRecaptcha(RECAPTCHA.ACTIONS.LOGIN),
  validate(loginSchema),
  asyncHandler((req, res) => authController.login(req, res)),
);

authRouter.post(
  "/logout",
  authenticate,
  asyncHandler((req, res) => authController.logout(req, res)),
);

authRouter.post(
  "/refresh",
  rateLimit({
    name: "auth.refresh",
    ...RATE_LIMIT.REFRESH_TOKEN,
    keyGenerator: rateLimitByIp,
  }),
  validate(refreshTokenSchema),
  asyncHandler((req, res) => authController.refresh(req, res)),
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler((req, res) => authController.me(req, res)),
);

/** Alias for forced-password-change allow-list (delegates to Security module). */
authRouter.post(
  "/change-password",
  authenticate,
  rateLimit({
    name: "auth.change-password",
    ...RATE_LIMIT.CHANGE_PASSWORD,
    keyGenerator: rateLimitByUser,
  }),
  validate(changePasswordSchema),
  asyncHandler((req, res) => securityController.changePassword(req, res)),
);

authRouter.post(
  "/forgot-password",
  rateLimit({
    name: "auth.forgot-password",
    ...RATE_LIMIT.FORGOT_PASSWORD,
    keyGenerator: rateLimitByIpAndEmail("email"),
  }),
  requireRecaptcha(RECAPTCHA.ACTIONS.FORGOT_PASSWORD),
  validate(forgotPasswordSchema),
  asyncHandler((req, res) => authController.forgotPassword(req, res)),
);

authRouter.post(
  "/reset-password",
  rateLimit({
    name: "auth.reset-password",
    ...RATE_LIMIT.RESET_PASSWORD,
    keyGenerator: rateLimitByIp,
  }),
  requireRecaptcha(RECAPTCHA.ACTIONS.RESET_PASSWORD),
  validate(resetPasswordApiSchema),
  asyncHandler((req, res) => authController.resetPassword(req, res)),
);

authRouter.post(
  "/verify-email",
  rateLimit({
    name: "auth.verify-email",
    max: 10,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByIp,
  }),
  validate(verifyEmailSchema),
  asyncHandler((req, res) => authController.verifyEmail(req, res)),
);

authRouter.get(
  "/verify-email",
  rateLimit({
    name: "auth.verify-email-redirect",
    max: 10,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByIp,
  }),
  validate(verifyEmailQuerySchema, "query"),
  asyncHandler((req, res) => authController.verifyEmailRedirect(req, res)),
);

authRouter.post(
  "/resend-verification",
  rateLimit({
    name: "auth.resend-verification",
    ...RATE_LIMIT.RESEND_VERIFICATION,
    keyGenerator: rateLimitByIpAndEmail("email"),
  }),
  validate(resendVerificationSchema),
  asyncHandler((req, res) => authController.resendVerification(req, res)),
);

authRouter.post(
  "/verify-otp",
  rateLimit({
    name: "auth.verify-otp",
    ...RATE_LIMIT.VERIFY_OTP,
    keyGenerator: rateLimitByOtpSession,
  }),
  validate(verifyOtpSchema),
  asyncHandler((req, res) => authController.verifyOtp(req, res)),
);

authRouter.post(
  "/resend-otp",
  rateLimit({
    name: "auth.resend-otp",
    ...RATE_LIMIT.VERIFY_OTP,
    keyGenerator: rateLimitByOtpSession,
  }),
  validate(resendOtpSchema),
  asyncHandler((req, res) => authController.resendOtp(req, res)),
);

authRouter.post(
  "/oauth/callback",
  rateLimit({
    name: "auth.oauth-callback",
    ...RATE_LIMIT.OAUTH_CALLBACK,
    keyGenerator: rateLimitByIp,
  }),
  validate(oauthCallbackSchema),
  asyncHandler((req, res) => authController.oauthCallback(req, res)),
);

authRouter.post(
  "/oauth/link",
  authenticate,
  rateLimit({
    name: "auth.oauth-link",
    ...RATE_LIMIT.OAUTH_CALLBACK,
    keyGenerator: rateLimitByIp,
  }),
  validate(oauthLinkSchema),
  asyncHandler((req, res) => authController.oauthLink(req, res)),
);

authRouter.post(
  "/oauth/unlink",
  authenticate,
  rateLimit({
    name: "auth.oauth-unlink",
    ...RATE_LIMIT.OAUTH_CALLBACK,
    keyGenerator: rateLimitByIp,
  }),
  validate(oauthUnlinkSchema),
  asyncHandler((req, res) => authController.oauthUnlink(req, res)),
);

authRouter.get(
  "/sessions",
  authenticate,
  rateLimit({
    name: "auth.sessions-list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => authController.listSessions(req, res)),
);

authRouter.delete(
  "/sessions",
  authenticate,
  rateLimit({
    name: "auth.sessions-revoke-others",
    max: 10,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => authController.revokeOtherSessions(req, res)),
);

authRouter.delete(
  "/sessions/:sessionId",
  authenticate,
  rateLimit({
    name: "auth.sessions-revoke",
    max: 20,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(revokeSessionParamsSchema, "params"),
  asyncHandler((req, res) => authController.revokeSession(req, res)),
);

authRouter.patch(
  "/sessions/:sessionId/rename",
  authenticate,
  rateLimit({
    name: "auth.sessions-rename",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(renameSessionParamsSchema, "params"),
  validate(renameSessionSchema),
  asyncHandler((req, res) => authController.renameSession(req, res)),
);

authRouter.get(
  "/mfa/status",
  authenticate,
  rateLimit({
    name: "auth.mfa-status",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => authController.mfaStatus(req, res)),
);

authRouter.post(
  "/mfa/setup",
  authenticate,
  rateLimit({
    name: "auth.mfa-setup",
    max: 5,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => authController.mfaSetup(req, res)),
);

authRouter.post(
  "/mfa/enable",
  authenticate,
  rateLimit({
    name: "auth.mfa-enable",
    ...RATE_LIMIT.VERIFY_OTP,
    keyGenerator: rateLimitByUser,
  }),
  validate(mfaEnableSchema),
  asyncHandler((req, res) => authController.mfaEnable(req, res)),
);

authRouter.post(
  "/mfa/disable",
  authenticate,
  rateLimit({
    name: "auth.mfa-disable",
    ...RATE_LIMIT.VERIFY_OTP,
    keyGenerator: rateLimitByUser,
  }),
  validate(mfaDisableSchema),
  asyncHandler((req, res) => authController.mfaDisable(req, res)),
);

/** Zero Trust step-up MFA (reuses existing TOTP/recovery). */
authRouter.post(
  "/mfa/step-up",
  authenticate,
  rateLimit({
    name: "auth.mfa-step-up",
    ...RATE_LIMIT.VERIFY_OTP,
    keyGenerator: rateLimitByUser,
  }),
  validate(mfaStepUpSchema),
  asyncHandler((req, res) => authController.mfaStepUp(req, res)),
);

export { authRouter };
