/**
 * Enterprise session-hardening types (Phase 2 Step 3).
 */

import type { SESSION_RISK_LEVELS } from "./session-hardening.constants.js";

export type SessionRiskLevel =
  (typeof SESSION_RISK_LEVELS)[keyof typeof SESSION_RISK_LEVELS];

export interface SessionHardeningPolicy {
  idleTimeoutMinutes: number;
  absoluteTimeoutDays: number;
  absoluteTimeoutRememberMeDays: number;
  maxConcurrentSessions: number;
  trustedDeviceEnabled: boolean;
  riskEnabled: boolean;
}

export interface SessionRiskSignals {
  deviceChanged: boolean;
  fingerprintChanged: boolean;
  ipChanged: boolean;
  ipCountryLikelyChanged: boolean;
  passwordAged: boolean;
  mfaEnabled: boolean;
  trustedDevice: boolean;
  recentSecurityIncident: boolean;
}

export interface SessionRiskAssessment {
  level: SessionRiskLevel;
  score: number;
  signals: SessionRiskSignals;
  reasons: string[];
  trustedDevice: boolean;
}

export interface SessionHardeningContext {
  sessionId: string;
  userId: string;
  sessionIp: string;
  sessionUa: string;
  sessionFingerprintHash: string | null;
  requestIp?: string | null;
  requestUa?: string | null;
  requestFingerprint?: string | null;
  twoFactorEnabled: boolean;
  passwordChangedAt: Date | null;
  createdAt: Date;
}

export interface RememberDeviceInput {
  userId: string;
  deviceFingerprint: string;
  label?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface TrustedDeviceRecord {
  userId: string;
  fingerprintHash: string;
  label: string | null;
  rememberedAt: number;
  expiresAt: number;
}
