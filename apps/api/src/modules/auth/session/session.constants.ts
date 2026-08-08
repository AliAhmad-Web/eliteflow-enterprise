/** Enterprise session audit vocabulary (server-side). */
export const SESSION_AUDIT_ACTIONS = {
  CREATED: "SESSION_CREATED",
  REVOKED: "SESSION_REVOKED",
  EXPIRED: "SESSION_EXPIRED",
  IDLE_TIMEOUT: "SESSION_IDLE_TIMEOUT",
  ABSOLUTE_TIMEOUT: "SESSION_ABSOLUTE_TIMEOUT",
  PASSWORD_CHANGED: "SESSION_PASSWORD_CHANGED",
  MFA_INVALID: "SESSION_MFA_INVALID",
  REVOKED_ADMIN: "SESSION_REVOKED_ADMIN",
  LIMIT_EXCEEDED: "SESSION_LIMIT_EXCEEDED",
} as const;

export const SESSION_AUDIT_RESOURCE = "session" as const;

/** Generic client message — never leak which session check failed. */
export const SESSION_INVALID_MESSAGE = "Invalid or expired session" as const;
