/** Audit actions for the centralized password setup / reset token lifecycle. */
export const PASSWORD_SETUP_AUDIT_ACTIONS = {
  CREATED: "PASSWORD_SETUP_CREATED",
  COMPLETED: "PASSWORD_SETUP_COMPLETED",
  EXPIRED: "PASSWORD_SETUP_EXPIRED",
  INVALID: "PASSWORD_SETUP_INVALID",
  REUSED_ATTEMPT: "PASSWORD_SETUP_REUSED_ATTEMPT",
} as const;

export const PASSWORD_SETUP_AUDIT_RESOURCE = "password_setup" as const;

/** Generic client-facing message — never leaks which validation failed. */
export const PASSWORD_SETUP_GENERIC_ERROR =
  "Invalid or expired password setup link" as const;
