import type { SessionRevokedReason, UserStatus } from "@enterprise/database";

export interface CreateSessionInput {
  userId: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  /** Optional client device fingerprint (hashed before storage). */
  deviceFingerprint?: string | null;
  rememberMe?: boolean;
}

export interface CreateSessionResult {
  sessionId: string;
  expiresAt: Date;
  rememberMe: boolean;
}

export interface ValidateSessionInput {
  sessionId: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceFingerprint?: string | null;
  /** Update lastActiveAt when throttling allows (default true). */
  touch?: boolean;
}

export interface ValidatedSession {
  sessionId: string;
  userId: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date | null;
  ipAddress: string;
  userAgent: string;
  fingerprintHash: string | null;
  userStatus: UserStatus;
  twoFactorEnabled: boolean;
  passwordChangedAt: Date | null;
  /** Carried from session validation to avoid a second user fetch on the auth hot path. */
  mustChangePassword: boolean;
  passwordHash: string | null;
  lockedUntil: Date | null;
}

export interface RevokeSessionInput {
  sessionId: string;
  reason: SessionRevokedReason;
  userId?: string;
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  auditAction?: string;
  metadata?: Record<string, unknown>;
}

export interface RevokeAllSessionsInput {
  userId: string;
  reason: SessionRevokedReason;
  exceptSessionId?: string;
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  auditAction?: string;
  metadata?: Record<string, unknown>;
}
