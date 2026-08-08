/** Audit / policy constants for enterprise password enforcement. */

export const PASSWORD_POLICY_AUDIT_ACTIONS = {
  CHANGE_REQUIRED: "PASSWORD_CHANGE_REQUIRED",
  CHANGE_COMPLETED: "PASSWORD_CHANGE_COMPLETED",
  CHANGE_BLOCKED: "PASSWORD_CHANGE_BLOCKED",
  EXPIRED: "PASSWORD_EXPIRED",
  HISTORY_REJECTED: "PASSWORD_HISTORY_REJECTED",
  POLICY_UPDATED: "PASSWORD_POLICY_UPDATED",
} as const;

export const PASSWORD_POLICY_AUDIT_RESOURCE = "password_policy" as const;

/** Generic client message — never leak why change is required. */
export const PASSWORD_CHANGE_REQUIRED_MESSAGE =
  "Password change required before continuing" as const;

/**
 * Reasons a password change may be required (server-side / audit only).
 * Never return these strings to API clients.
 */
export const PASSWORD_CHANGE_REASONS = {
  MUST_CHANGE_FLAG: "MUST_CHANGE_FLAG",
  PASSWORD_EXPIRED: "PASSWORD_EXPIRED",
  ADMIN_RESET: "ADMIN_RESET",
  SECURITY_FORCED: "SECURITY_FORCED",
  NEW_ACCOUNT: "NEW_ACCOUNT",
  SETUP_PENDING: "SETUP_PENDING",
} as const;

export type PasswordChangeReason =
  (typeof PASSWORD_CHANGE_REASONS)[keyof typeof PASSWORD_CHANGE_REASONS];
