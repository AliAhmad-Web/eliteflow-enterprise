/**
 * Enterprise session-hardening constants (Phase 2 Step 3).
 */

export const SESSION_HARDENING_STORE_PREFIX = "ebm:trusted-device";

/** Default trusted-device TTL (days). */
export const TRUSTED_DEVICE_TTL_DAYS = 30;

export const SESSION_RISK_LEVELS = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;

export const SESSION_HARDENING_AUDIT_ACTIONS = {
  HIGH_RISK: "session.hardening.high_risk",
  ROTATED: "session.hardening.rotated",
  FORCED_REVOCATION: "session.hardening.forced_revocation",
  TRUSTED_DEVICE: "session.hardening.trusted_device",
} as const;
