import { UserRole } from "../enums/auth.enums.js";

// =============================================================================
// Password Policy (ADR-014 / Authentication Architecture §8.1)
// =============================================================================

export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_DIGIT: true,
  REQUIRE_SPECIAL: true,
  SPECIAL_CHAR_PATTERN: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
  /** Number of previous password hashes retained to prevent reuse */
  HISTORY_COUNT: 5,
  /**
   * Minimum hours before a password may be changed again (0 = disabled).
   * Forced / required password changes bypass this rule.
   */
  MIN_AGE_HOURS: 24,
  /**
   * Maximum password age in days before a change is required (0 = disabled).
   * Aligns with Zero Trust password-age guidance (90 days).
   */
  MAX_AGE_DAYS: 90,
} as const;

// =============================================================================
// OTP Policy
// =============================================================================

export const OTP_RULES = {
  LENGTH: 6,
  EXPIRY_MINUTES_LOGIN: 10,
  EXPIRY_MINUTES_SENSITIVE: 5,
  MAX_ATTEMPTS: 3,
  RESEND_COOLDOWN_SECONDS: 60,
} as const;

// =============================================================================
// Token Expiration
// =============================================================================

export const TOKEN_EXPIRATION = {
  /** Access token lifetime in seconds (15 minutes) */
  ACCESS_TOKEN_SECONDS: 15 * 60,
  /** Refresh token lifetime in seconds (1 day — normal login). */
  REFRESH_TOKEN_SECONDS: 1 * 24 * 60 * 60,
  /** Refresh token lifetime when remember-me is enabled (30 days). */
  REFRESH_TOKEN_SECONDS_REMEMBER_ME: 30 * 24 * 60 * 60,
  /** Email verification token lifetime in hours */
  EMAIL_VERIFICATION_HOURS: 24,
  /**
   * Password setup / one-time reset token lifetime in minutes (enterprise default).
   * Used by PasswordSetupService for hire, invitation, admin reset, and forgot-password.
   */
  PASSWORD_SETUP_MINUTES: 30,
  /**
   * @deprecated Prefer PASSWORD_SETUP_MINUTES. Kept for backward-compatible imports.
   * Value equals PASSWORD_SETUP_MINUTES / 60 (0.5 hours).
   */
  PASSWORD_RESET_HOURS: 0.5,
  /** Account lockout duration in minutes */
  ACCOUNT_LOCKOUT_MINUTES: 15,
  /** Maximum failed login attempts before lockout */
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  /** Maximum concurrent device sessions per user */
  MAX_CONCURRENT_SESSIONS: 5,
  /**
   * Idle timeout — no activity for this many minutes → session revoked.
   * Enforced on every authenticated request via SessionService.validateSession.
   */
  IDLE_SESSION_MINUTES: 30,
  /**
   * @deprecated Prefer IDLE_SESSION_MINUTES for request-time idle checks.
   * Cleanup job still uses day-scale retention windows separately.
   */
  IDLE_SESSION_DAYS: 30,
  /** Absolute session lifetime in days (non-remember-me). */
  ABSOLUTE_SESSION_DAYS: 7,
  /** Absolute session lifetime in days when remember-me is enabled. */
  ABSOLUTE_SESSION_DAYS_REMEMBER_ME: 30,
  /** Throttle for lastActiveAt updates (seconds). */
  SESSION_ACTIVITY_TOUCH_SECONDS: 60,
  /** How long to retain revoked sessions before hard-delete (days) */
  REVOKED_SESSION_RETENTION_DAYS: 30,
  /** How long to retain audit logs before cleanup (days); 0 = never delete.
   * Compliance policy retains audit ~7 years with no automatic deletion.
   * Session cleanup must NOT purge compliance audit records.
   */
  AUDIT_LOG_RETENTION_DAYS: 0,
} as const;

// =============================================================================
// Rate Limiting (Authentication Architecture §8.2)
// =============================================================================

export const RATE_LIMIT = {
  LOGIN: { max: 10, windowMs: 15 * 60 * 1000 },
  SIGNUP: { max: 5, windowMs: 60 * 60 * 1000 },
  FORGOT_PASSWORD: { max: 3, windowMs: 60 * 60 * 1000 },
  RESET_PASSWORD: { max: 5, windowMs: 60 * 60 * 1000 },
  VERIFY_OTP: { max: 5, windowMs: 10 * 60 * 1000 },
  RESEND_VERIFICATION: { max: 3, windowMs: 60 * 60 * 1000 },
  REFRESH_TOKEN: { max: 30, windowMs: 15 * 60 * 1000 },
  OAUTH_CALLBACK: { max: 10, windowMs: 15 * 60 * 1000 },
  GLOBAL_API: { max: 100, windowMs: 60 * 1000 },
  /** Public API v1 — per API-key / IP budget */
  PUBLIC_API: { max: 60, windowMs: 60 * 1000 },
  PUBLIC_API_KEY_MANAGE: { max: 20, windowMs: 60 * 1000 },
  /** Phase 17 — stricter API-class limits */
  AI_CHAT: { max: 40, windowMs: 15 * 60 * 1000 },
  FILE_UPLOAD: { max: 40, windowMs: 15 * 60 * 1000 },
  COMMUNICATION_WRITE: { max: 60, windowMs: 15 * 60 * 1000 },
  CONTACT_FORM: { max: 5, windowMs: 60 * 60 * 1000 },
  CHANGE_PASSWORD: { max: 5, windowMs: 60 * 60 * 1000 },
  SECURITY_READ: { max: 60, windowMs: 60 * 1000 },
} as const;

// =============================================================================
// Cookie Names
// =============================================================================

export const AUTH_COOKIES = {
  REFRESH_TOKEN: "__Secure-refresh-token",
  REFRESH_TOKEN_DEV: "refresh-token",
  /** Enterprise CSRF double-submit cookie (Phase 2 Step 2). */
  CSRF_TOKEN: "XSRF-TOKEN",
  CSRF_TOKEN_DEV: "XSRF-TOKEN",
  /** @deprecated legacy names — still accepted server-side during migration */
  CSRF_TOKEN_LEGACY: "__Host-csrf-token",
  CSRF_TOKEN_DEV_LEGACY: "csrf-token",
} as const;

// =============================================================================
// HTTP Headers
// =============================================================================

export const AUTH_HEADERS = {
  AUTHORIZATION: "Authorization",
  BEARER_PREFIX: "Bearer ",
  RETRY_AFTER: "Retry-After",
  REQUEST_ID: "X-Request-Id",
  CSRF_TOKEN: "X-CSRF-Token",
} as const;

// =============================================================================
// Google reCAPTCHA v3
// =============================================================================

export const RECAPTCHA = {
  /** Minimum acceptable score (0.0–1.0) */
  MIN_SCORE: 0.5,
  ACTIONS: {
    LOGIN: "login",
    SIGNUP: "signup",
    FORGOT_PASSWORD: "forgot_password",
    RESET_PASSWORD: "reset_password",
    CONTACT: "contact",
  },
} as const;

// =============================================================================
// API Routing
// =============================================================================

export const API_PREFIX = "/api/v1" as const;
export const AUTH_API_PREFIX = `${API_PREFIX}/auth` as const;
export const CLIENTS_API_PREFIX = `${API_PREFIX}/clients` as const;
export const PROJECTS_API_PREFIX = `${API_PREFIX}/projects` as const;
export const TASKS_API_PREFIX = `${API_PREFIX}/tasks` as const;
export const INVOICES_API_PREFIX = `${API_PREFIX}/invoices` as const;
export const BILLING_API_PREFIX = `${API_PREFIX}/billing` as const;
export const AI_API_PREFIX = `${API_PREFIX}/ai` as const;
export const FILES_API_PREFIX = `${API_PREFIX}/files` as const;
export const CALENDAR_API_PREFIX = `${API_PREFIX}/calendar` as const;
export const TEAM_API_PREFIX = `${API_PREFIX}/team` as const;
export const REPORTS_API_PREFIX = `${API_PREFIX}/reports` as const;
export const NOTIFICATIONS_API_PREFIX = `${API_PREFIX}/notifications` as const;
export const COMMUNICATION_API_PREFIX = `${API_PREFIX}/communication` as const;
export const SECURITY_API_PREFIX = `${API_PREFIX}/security` as const;
export const SETTINGS_API_PREFIX = `${API_PREFIX}/settings` as const;
export const SEARCH_API_PREFIX = `${API_PREFIX}/search` as const;
export const INTEGRATIONS_API_PREFIX = `${API_PREFIX}/integrations` as const;
export const WHITEBOARDS_API_PREFIX = `${API_PREFIX}/whiteboards` as const;
export const CUSTOMER_REQUESTS_API_PREFIX = `${API_PREFIX}/customer-requests` as const;

// =============================================================================
// Auth Error Codes (Authentication Architecture §10.7)
// =============================================================================

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED: "AUTH_EMAIL_NOT_VERIFIED",
  ACCOUNT_LOCKED: "AUTH_ACCOUNT_LOCKED",
  ACCOUNT_DEACTIVATED: "AUTH_ACCOUNT_DEACTIVATED",
  TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  REFRESH_TOKEN_INVALID: "AUTH_REFRESH_TOKEN_INVALID",
  REFRESH_TOKEN_REUSED: "AUTH_REFRESH_TOKEN_REUSED",
  OTP_INVALID: "AUTH_OTP_INVALID",
  OTP_EXPIRED: "AUTH_OTP_EXPIRED",
  OTP_MAX_ATTEMPTS: "AUTH_OTP_MAX_ATTEMPTS",
  EMAIL_ALREADY_EXISTS: "AUTH_EMAIL_ALREADY_EXISTS",
  RESET_TOKEN_INVALID: "AUTH_RESET_TOKEN_INVALID",
  RESET_TOKEN_EXPIRED: "AUTH_RESET_TOKEN_EXPIRED",
  RATE_LIMITED: "AUTH_RATE_LIMITED",
  EMAIL_DELIVERY_FAILED: "AUTH_EMAIL_DELIVERY_FAILED",
  FORBIDDEN: "AUTH_FORBIDDEN",
  OAUTH_ACCOUNT_EXISTS: "AUTH_OAUTH_ACCOUNT_EXISTS",
  OAUTH_TOKEN_INVALID: "AUTH_OAUTH_TOKEN_INVALID",
  OAUTH_EMAIL_UNVERIFIED: "AUTH_OAUTH_EMAIL_UNVERIFIED",
  OAUTH_PROVIDER_MISMATCH: "AUTH_OAUTH_PROVIDER_MISMATCH",
  OAUTH_UNLINK_DENIED: "AUTH_OAUTH_UNLINK_DENIED",
  PASSWORD_REUSED: "AUTH_PASSWORD_REUSED",
  CAPTCHA_FAILED: "AUTH_CAPTCHA_FAILED",
  CSRF_INVALID: "AUTH_CSRF_INVALID",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  /**
   * Authenticated caller must change password before accessing protected APIs.
   * Generic message only — do not leak reason details to the client.
   */
  PASSWORD_CHANGE_REQUIRED: "AUTH_PASSWORD_CHANGE_REQUIRED",
  /**
   * ADMIN / SUPER_ADMIN must enroll MFA before accessing privileged APIs.
   * Machine-readable — clients should route to MFA setup, not retry login.
   */
  MFA_ENROLLMENT_REQUIRED: "AUTH_MFA_ENROLLMENT_REQUIRED",
  /** Server-side session is missing, revoked, expired, or otherwise invalid. */
  SESSION_INVALID: "AUTH_SESSION_INVALID",
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

// =============================================================================
// Role Metadata
// =============================================================================

export const ROLE_DASHBOARD_ROUTES: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: "/admin",
  [UserRole.ADMIN]: "/dashboard",
  [UserRole.EMPLOYEE]: "/workspace",
  [UserRole.CLIENT]: "/portal",
};
