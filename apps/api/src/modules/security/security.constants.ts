/** Phase 17 — Enterprise Security module constants */

export const SECURITY_AUDIT_RESOURCE = "security" as const;

export const SECURITY_AUDIT_ACTIONS = {
  PASSWORD_CHANGED: "security.password_changed",
  PASSWORD_REUSE_BLOCKED: "security.password_reuse_blocked",
  ACCOUNT_UNLOCKED: "security.account_unlocked",
  SESSION_TERMINATED: "security.session_terminated",
  CONTACT_SUBMITTED: "security.contact_submitted",
  CAPTCHA_FAILED: "security.captcha_failed",
  CSRF_REJECTED: "security.csrf_rejected",
  ALERT_RESOLVED: "security.alert_resolved",
  DASHBOARD_VIEWED: "security.dashboard_viewed",
} as const;

export const SECURITY_EVENT_TYPES = {
  ACCOUNT_LOCKED: "account_locked",
  ACCOUNT_UNLOCKED: "account_unlocked",
  FAILED_LOGIN_BURST: "failed_login_burst",
  PASSWORD_REUSE: "password_reuse",
  TOKEN_REUSE: "token_reuse",
  CAPTCHA_FAILED: "captcha_failed",
  RATE_LIMITED: "rate_limited",
  SESSION_TERMINATED: "session_terminated",
  SUSPICIOUS_LOGIN: "suspicious_login",
} as const;

export const SECURITY_MESSAGES = {
  PASSWORD_CHANGED: "Password updated successfully.",
  PASSWORD_REUSED:
    "This password was used recently. Please choose a different password.",
  ACCOUNT_UNLOCKED: "Account unlocked successfully.",
  SESSION_TERMINATED: "Session terminated successfully.",
  CONTACT_RECEIVED:
    "Thank you. Your message has been received and will be reviewed shortly.",
  CAPTCHA_FAILED: "Captcha verification failed. Please try again.",
  CSRF_INVALID: "Invalid or missing CSRF token.",
  ALERT_RESOLVED: "Security alert marked as resolved.",
  NOT_FOUND: "Resource not found",
  FORBIDDEN: "You do not have permission to perform this action",
} as const;
