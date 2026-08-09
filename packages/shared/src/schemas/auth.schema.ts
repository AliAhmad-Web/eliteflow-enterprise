import { z } from "zod";

import { OAuthProvider } from "../enums/auth.enums.js";
import {
  emailSchema,
  firstNameSchema,
  lastNameSchema,
  mfaChallengeCodeSchema,
  otpCodeSchema,
  passwordSchema,
  tokenSchema,
  uuidSchema,
  withPasswordConfirmation,
} from "./common.schema.js";
import { captchaTokenSchema } from "./security.schema.js";

// =============================================================================
// Signup
// =============================================================================

const signupBaseSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
  captchaToken: captchaTokenSchema,
});

export const signupSchema = withPasswordConfirmation(signupBaseSchema);

export type SignupInput = z.infer<typeof signupSchema>;

// =============================================================================
// Login
// =============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
  /** Optional — extends refresh/absolute session lifetime when true. */
  rememberMe: z.boolean().optional().default(false),
  captchaToken: captchaTokenSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;

// =============================================================================
// Forgot Password
// =============================================================================

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  captchaToken: captchaTokenSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// =============================================================================
// Reset Password
// =============================================================================

const resetPasswordBaseSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
  captchaToken: captchaTokenSchema,
});

/** API body — password confirmation is validated on the client only */
export const resetPasswordApiSchema = resetPasswordBaseSchema;

export type ResetPasswordApiInput = z.infer<typeof resetPasswordApiSchema>;

export const resetPasswordSchema = withPasswordConfirmation(resetPasswordBaseSchema);

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// =============================================================================
// Verify Email
// =============================================================================

export const verifyEmailSchema = z.object({
  token: tokenSchema,
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

/** Query-param variant for GET /verify-email?token=xxx */
export const verifyEmailQuerySchema = z.object({
  token: tokenSchema,
});

export type VerifyEmailQueryInput = z.infer<typeof verifyEmailQuerySchema>;

// =============================================================================
// Verify OTP
// =============================================================================

export const verifyOtpSchema = z.object({
  otpSessionId: uuidSchema,
  code: mfaChallengeCodeSchema,
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

// =============================================================================
// MFA enrollment (TOTP)
// =============================================================================

export const mfaEnableSchema = z.object({
  code: otpCodeSchema,
});

export type MfaEnableInput = z.infer<typeof mfaEnableSchema>;

export const mfaDisableSchema = z.object({
  code: mfaChallengeCodeSchema,
});

export type MfaDisableInput = z.infer<typeof mfaDisableSchema>;

/** Step-up MFA for Zero Trust (reuses TOTP/recovery challenge). */
export const mfaStepUpSchema = z.object({
  code: mfaChallengeCodeSchema,
});

export type MfaStepUpInput = z.infer<typeof mfaStepUpSchema>;

export const mfaStepUpResponseSchema = z.object({
  verified: z.boolean(),
  expiresAt: z.string(),
  requiresStepUp: z.literal(false),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});

export type MfaStepUpResponse = z.infer<typeof mfaStepUpResponseSchema>;

export const mfaStatusSchema = z.object({
  enabled: z.boolean(),
  enrollmentRequired: z.boolean(),
  canEnroll: z.boolean(),
  recoveryCodesRemaining: z.number().int().nonnegative().optional(),
});

export type MfaStatusOutput = z.infer<typeof mfaStatusSchema>;

// =============================================================================
// Refresh Token
// =============================================================================

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, "Refresh token is required").optional(),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// =============================================================================
// Resend Verification
// =============================================================================

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

// =============================================================================
// Resend OTP
// =============================================================================

export const resendOtpSchema = z.object({
  otpSessionId: uuidSchema,
});

export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

// =============================================================================
// OAuth Callback
// =============================================================================

export const oauthCallbackSchema = z.object({
  provider: z.enum([OAuthProvider.GOOGLE, OAuthProvider.GITHUB], {
    errorMap: () => ({ message: "Invalid OAuth provider" }),
  }),
  /** `signup` rejects existing emails; `login` links/signs in as usual. */
  intent: z.enum(["login", "signup"]).default("login"),
  supabaseAccessToken: z
    .string({ required_error: "OAuth token is required" })
    .trim()
    .min(1, "OAuth token is required"),
  supabaseRefreshToken: z.string().trim().min(1).optional(),
});

export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>;

/** Link a provider to an authenticated account (same payload as callback). */
export const oauthLinkSchema = oauthCallbackSchema;

export type OAuthLinkInput = z.infer<typeof oauthLinkSchema>;

export const oauthUnlinkSchema = z.object({
  provider: z.enum([OAuthProvider.GOOGLE, OAuthProvider.GITHUB], {
    errorMap: () => ({ message: "Invalid OAuth provider" }),
  }),
});

export type OAuthUnlinkInput = z.infer<typeof oauthUnlinkSchema>;

// =============================================================================
// Session Management
// =============================================================================

export const revokeSessionParamsSchema = z.object({
  sessionId: uuidSchema,
});

export type RevokeSessionParamsInput = z.infer<typeof revokeSessionParamsSchema>;

export const renameSessionSchema = z.object({
  deviceName: z
    .string({ required_error: "Device name is required" })
    .trim()
    .min(1, "Device name is required")
    .max(200, "Device name must not exceed 200 characters"),
});

export type RenameSessionInput = z.infer<typeof renameSessionSchema>;

export const renameSessionParamsSchema = revokeSessionParamsSchema;

export type RenameSessionParamsInput = z.infer<typeof renameSessionParamsSchema>;

// =============================================================================
// Response Schemas (optional runtime validation)
// =============================================================================

export const authTokensSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
  tokenType: z.literal("Bearer"),
});

export const safeUserSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  avatarUrl: z.string().nullable(),
  role: z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
  }),
  status: z.string(),
  emailVerified: z.boolean(),
  permissions: z.array(z.string()),
  mustChangePassword: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
  mfaEnrollmentRequired: z.boolean().optional(),
  companyId: uuidSchema.nullable(),
  companyName: z.string().nullable(),
  createdAt: z.string(),
});

export const loginResponseSchema = z.object({
  user: safeUserSchema,
  tokens: authTokensSchema.optional(),
  requiresOtp: z.boolean().optional(),
  otpSessionId: uuidSchema.optional(),
  mfaMethod: z.enum(["totp", "email"]).optional(),
  expiresIn: z.number().int().positive().optional(),
});

export type LoginResponseOutput = z.infer<typeof loginResponseSchema>;
