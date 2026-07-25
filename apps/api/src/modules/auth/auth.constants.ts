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
  SESSION_NOT_FOUND: "Session not found",
  SESSION_CURRENT_REVOKE_DENIED:
    "Cannot revoke the current session from this action. Use logout instead.",
  SESSION_RENAMED: "Device renamed successfully.",
  SESSIONS_REVOKED: "Other devices have been signed out.",
} as const;

export const DEFAULT_CLIENT_ROLE_CODE = "CLIENT" as const;

export const LOGIN_FAILURE_REASONS = {
  INVALID_CREDENTIALS: "invalid_credentials",
  EMAIL_NOT_VERIFIED: "email_not_verified",
  ACCOUNT_LOCKED: "account_locked",
  ACCOUNT_DEACTIVATED: "account_deactivated",
  NO_PASSWORD: "no_password_set",
} as const;
