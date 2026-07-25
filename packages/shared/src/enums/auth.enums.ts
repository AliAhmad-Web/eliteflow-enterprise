/**
 * Account lifecycle status.
 * Mirrors `UserStatus` in `@enterprise/database` Prisma schema.
 */
export const UserStatus = {
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  ACTIVE: "ACTIVE",
  LOCKED: "LOCKED",
  DEACTIVATED: "DEACTIVATED",
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/**
 * Application role codes for RBAC.
 * Mirrors seeded `roles.code` values in the database.
 */
export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  EMPLOYEE: "EMPLOYEE",
  CLIENT: "CLIENT",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * Supported OAuth identity providers.
 * Mirrors `OAuthProvider` in Prisma schema.
 */
export const OAuthProvider = {
  GOOGLE: "GOOGLE",
  GITHUB: "GITHUB",
} as const;

export type OAuthProvider = (typeof OAuthProvider)[keyof typeof OAuthProvider];

/**
 * Purpose of a one-time password verification request.
 * Mirrors `OtpPurpose` in Prisma schema.
 */
export const OtpPurpose = {
  LOGIN_2FA: "LOGIN_2FA",
  PASSWORD_RESET: "PASSWORD_RESET",
  SENSITIVE_ACTION: "SENSITIVE_ACTION",
} as const;

export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose];

/**
 * Application-layer session status derived from session timestamps.
 */
export const SessionStatus = {
  ACTIVE: "ACTIVE",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

/**
 * Token types used in the JWT + refresh token authentication strategy.
 */
export const TokenType = {
  ACCESS: "ACCESS",
  REFRESH: "REFRESH",
} as const;

export type TokenType = (typeof TokenType)[keyof typeof TokenType];
