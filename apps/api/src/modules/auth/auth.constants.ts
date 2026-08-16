/** Module-level auth constants (supplements @enterprise/shared). */

export const AUTH_AUDIT_ACTIONS = {
  SIGNUP: "auth.signup",
  LOGIN: "auth.login",
  FAILED_LOGIN: "auth.failed_login",
  LOGOUT: "auth.logout",
  REFRESH: "auth.refresh",
  TOKEN_REUSE_DETECTED: "auth.token_reuse_detected",
  ACCOUNT_LOCKED: "auth.account_locked",
  PASSWORD_RESET_REQUESTED: "auth.password_reset_requested",
  PASSWORD_RESET_COMPLETED: "auth.password_reset_completed",
  /** Aliases aligned with PasswordSetupService audit vocabulary */
  PASSWORD_SETUP_CREATED: "PASSWORD_SETUP_CREATED",
  PASSWORD_SETUP_COMPLETED: "PASSWORD_SETUP_COMPLETED",
  PASSWORD_SETUP_EXPIRED: "PASSWORD_SETUP_EXPIRED",
  PASSWORD_SETUP_INVALID: "PASSWORD_SETUP_INVALID",
  PASSWORD_SETUP_REUSED_ATTEMPT: "PASSWORD_SETUP_REUSED_ATTEMPT",
  EMAIL_VERIFIED: "auth.email_verified",
  VERIFICATION_EMAIL_SENT: "auth.verification_email_sent",
  OTP_SENT: "auth.otp_sent",
  OTP_VERIFIED: "auth.otp_verified",
  OTP_FAILED: "auth.otp_failed",
  OTP_RESENT: "auth.otp_resent",
  OAUTH_LOGIN: "auth.oauth_login",
  OAUTH_SIGNUP: "auth.oauth_signup",
  OAUTH_LINKED: "auth.oauth_linked",
  OAUTH_UNLINKED: "auth.oauth_unlinked",
  PERMISSION_DENIED: "authz.permission_denied",
  ROLE_MISMATCH: "authz.role_mismatch",
  SESSION_CREATED: "auth.session_created",
  SESSION_REVOKED: "auth.session_revoked",
  SESSION_LOGOUT_ALL: "auth.session_logout_all",
  SESSION_RENAMED: "auth.session_renamed",
  SESSION_EXPIRED: "auth.session_expired",
  SESSION_CLEANUP: "auth.session_cleanup",
  /** Enterprise session audit aliases */
  SESSION_IDLE_TIMEOUT: "SESSION_IDLE_TIMEOUT",
  SESSION_ABSOLUTE_TIMEOUT: "SESSION_ABSOLUTE_TIMEOUT",
  SESSION_PASSWORD_CHANGED: "SESSION_PASSWORD_CHANGED",
  SESSION_MFA_INVALID: "SESSION_MFA_INVALID",
  SESSION_REVOKED_ADMIN: "SESSION_REVOKED_ADMIN",
  SESSION_LIMIT_EXCEEDED: "SESSION_LIMIT_EXCEEDED",
  MFA_ENABLED: "auth.mfa_enabled",
  MFA_DISABLED: "auth.mfa_disabled",
  MFA_SUCCESS: "auth.mfa_success",
  MFA_FAILURE: "auth.mfa_failure",
  MFA_RECOVERY_USED: "auth.mfa_recovery_used",
} as const;

export const AUTH_AUDIT_RESOURCE = "auth" as const;

export const AUTH_MESSAGES = {
  FORGOT_PASSWORD_SUCCESS:
    "If an account exists for that email address, a password reset link has been sent.",
  RESEND_VERIFICATION_SUCCESS:
    "If an account exists for that email address, a verification link has been sent.",
  RESET_PASSWORD_SUCCESS:
    "Password updated successfully. Please sign in with your new password.",
  VERIFY_EMAIL_SUCCESS:
    "Email verified successfully. You can now sign in.",
  RESET_TOKEN_INVALID: "Invalid or expired reset token",
  SESSION_INVALID: "Invalid or expired session",
  VERIFY_TOKEN_INVALID: "Invalid or expired verification token",
  OTP_INVALID: "Invalid or expired verification code",
  OTP_RESEND_COOLDOWN: "Please wait before requesting another code",
  SENSITIVE_ACTION_VERIFIED: "Verification successful. You may proceed with your request.",
  OAUTH_LINKED: "OAuth provider linked successfully.",
  OAUTH_UNLINKED: "OAuth provider unlinked successfully.",
  OAUTH_UNLINK_DENIED:
    "Cannot unlink the only sign-in method. Set a password or link another provider first.",
  OAUTH_SIGNUP_EMAIL_EXISTS:
    "An account with this email already exists. Please sign in instead.",
  OAUTH_ACCOUNT_NOT_FOUND:
    "Account not found. Please create an EliteFlow account first, then continue with Google or GitHub.",
  SESSION_NOT_FOUND: "Session not found",
  SESSION_CURRENT_REVOKE_DENIED:
    "Cannot revoke the current session from this action. Use logout instead.",
  SESSION_RENAMED: "Device renamed successfully.",
  SESSIONS_REVOKED: "Other devices have been signed out.",
  MFA_SETUP_EXPIRED: "MFA setup expired. Please start enrollment again.",
  MFA_NOT_AVAILABLE: "Multi-factor authentication is not available for this account.",
  MFA_ALREADY_ENABLED: "Multi-factor authentication is already enabled.",
  MFA_NOT_ENABLED: "Multi-factor authentication is not enabled.",
  MFA_ENABLED: "Multi-factor authentication enabled successfully.",
  MFA_DISABLED: "Multi-factor authentication disabled successfully.",
} as const;

export const DEFAULT_CLIENT_ROLE_CODE = "CLIENT" as const;

export const LOGIN_FAILURE_REASONS = {
  INVALID_CREDENTIALS: "invalid_credentials",
  EMAIL_NOT_VERIFIED: "email_not_verified",
  ACCOUNT_LOCKED: "account_locked",
  ACCOUNT_DEACTIVATED: "account_deactivated",
  NO_PASSWORD: "no_password_set",
} as const;
