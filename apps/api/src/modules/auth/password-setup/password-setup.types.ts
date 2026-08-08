import type { RequestContext } from "../auth.types.js";

/** Why a password setup / one-time reset token was issued. */
export const PASSWORD_SETUP_PURPOSE = {
  INVITATION: "INVITATION",
  ADMIN_CREATE: "ADMIN_CREATE",
  ADMIN_RESET: "ADMIN_RESET",
  FORGOT_PASSWORD: "FORGOT_PASSWORD",
} as const;

export type PasswordSetupPurpose =
  (typeof PASSWORD_SETUP_PURPOSE)[keyof typeof PASSWORD_SETUP_PURPOSE];

export interface PasswordSetupAuditContext {
  userId?: string | null;
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  /** Never include raw tokens or URLs containing tokens. */
  metadata?: Record<string, unknown>;
}

export interface CreatePasswordSetupTokenInput {
  userId: string;
  purpose: PasswordSetupPurpose;
  /** Override default TTL (minutes). */
  expiresInMinutes?: number;
  audit?: PasswordSetupAuditContext;
}

export interface PasswordSetupTokenResult {
  /** Opaque single-use token — return to authorized callers only; never log. */
  rawToken: string;
  tokenId: string;
  expiresAt: Date;
  /** Full setup / reset URL containing the token — never log or audit. */
  setupUrl: string;
  expiresInMinutes: number;
  purpose: PasswordSetupPurpose;
}

export interface ConsumedPasswordSetupToken {
  tokenId: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string | null;
    deletedAt: Date | null;
    mustChangePassword: boolean;
  };
}

export interface ConsumePasswordSetupTokenInput {
  rawToken: string;
  context: RequestContext;
}

export interface PasswordSetupPublicPayload {
  passwordSetupRequired: true;
  /** Present only when caller is authorized to see the one-time link. */
  passwordSetupUrl?: string;
  expiresAt: string;
}
