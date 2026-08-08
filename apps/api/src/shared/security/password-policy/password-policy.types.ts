import type { PasswordChangeReason } from "./password-policy.constants.js";

export interface PasswordPolicyUserSnapshot {
  id: string;
  mustChangePassword: boolean;
  passwordHash: string | null;
  passwordChangedAt: Date | null;
  deletedAt: Date | null;
}

export interface PasswordPolicyConfig {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecial: boolean;
  historyCount: number;
  minAgeHours: number;
  maxAgeDays: number;
}

export interface PasswordChangeDecision {
  requiresChange: boolean;
  expired: boolean;
  /** Age in whole days; null when never set. */
  ageDays: number | null;
  reasons: PasswordChangeReason[];
  mustChangePassword: boolean;
  passwordSet: boolean;
}

export interface AllowedEndpointRule {
  method: string;
  /** Path relative to /api/v1 (e.g. /auth/me). */
  path: string;
  /** When true, any method under exact path matches. */
  anyMethod?: boolean;
  /** When true, path is treated as a prefix match. */
  prefix?: boolean;
}

export interface EnforcePasswordChangeContext {
  userId: string;
  method: string;
  path: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  /** Optional snapshot from session validation — skips a duplicate user query. */
  userSnapshot?: PasswordPolicyUserSnapshot | null;
}
