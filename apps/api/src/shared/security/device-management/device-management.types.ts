/**
 * Enterprise Device Management types.
 */

import type {
  DEVICE_MONITORING_EVENTS,
  DEVICE_RISK_SIGNALS,
  DEVICE_STATES,
  DEVICE_TYPES,
} from "./device-management.constants.js";

export type DeviceState = (typeof DEVICE_STATES)[keyof typeof DEVICE_STATES];
export type DeviceType = (typeof DEVICE_TYPES)[keyof typeof DEVICE_TYPES];
export type DeviceRiskSignal =
  (typeof DEVICE_RISK_SIGNALS)[keyof typeof DEVICE_RISK_SIGNALS];
export type DeviceMonitoringEvent =
  (typeof DEVICE_MONITORING_EVENTS)[keyof typeof DEVICE_MONITORING_EVENTS];

export interface DeviceManagementPolicy {
  enabled: boolean;
  maxDevicesPerUser: number;
  inactiveTimeoutDays: number;
  autoCleanupEnabled: boolean;
  unknownDeviceDetection: boolean;
  blockedDeviceEnforcement: boolean;
  fingerprintValidation: boolean;
  deviceFloodWindowMs: number;
  deviceFloodThreshold: number;
  rapidSwitchWindowMs: number;
  rapidSwitchThreshold: number;
  highRiskScoreThreshold: number;
}

export interface DeviceIpHistoryEntry {
  ipAddress: string;
  seenAt: number;
  country?: string | null;
  city?: string | null;
}

/**
 * Internal registry record — fingerprintHash only (never raw fingerprint).
 */
export interface DeviceRecord {
  id: string;
  userId: string;
  fingerprintHash: string | null;
  label: string | null;
  deviceType: DeviceType;
  browser: string;
  platform: string;
  operatingSystem: string;
  userAgent: string;
  ipHistory: DeviceIpHistoryEntry[];
  country: string | null;
  city: string | null;
  timezone: string | null;
  firstSeenAt: number;
  lastSeenAt: number;
  riskScore: number;
  riskSignals: DeviceRiskSignal[];
  state: DeviceState;
  trusted: boolean;
  blocked: boolean;
  sessionId: string | null;
}

/** Sanitized DTO — no raw fingerprints, tokens, or secrets. */
export interface ManagedDeviceDto {
  id: string;
  userId: string;
  label: string | null;
  deviceType: DeviceType;
  browser: string;
  platform: string;
  operatingSystem: string;
  userAgent: string;
  lastIpAddress: string | null;
  country: string | null;
  city: string | null;
  timezone: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  riskScore: number;
  riskSignals: DeviceRiskSignal[];
  state: DeviceState;
  trusted: boolean;
  blocked: boolean;
  fingerprintBound: boolean;
}

export interface RegisterDeviceInput {
  userId: string;
  deviceFingerprint?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  sessionId?: string | null;
  label?: string | null;
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
}

export interface ObserveDeviceInput {
  userId: string;
  deviceFingerprint?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  sessionId?: string | null;
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
}

export interface TrustDeviceInput {
  deviceId: string;
  actorUserId: string;
  /** MFA TOTP / recovery code — required to trust. */
  mfaCode: string;
  label?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface RenameDeviceInput {
  deviceId: string;
  actorUserId: string;
  label: string;
}

export interface DeviceActionInput {
  deviceId: string;
  actorUserId: string;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface DeviceRiskAssessment {
  score: number;
  signals: DeviceRiskSignal[];
  stateHint: DeviceState | null;
}

export interface DeviceManagementDashboardMetrics {
  registeredDevices: number;
  trustedDevices: number;
  blockedDevices: number;
  suspiciousDevices: number;
  unknownDevices: number;
  recentDevices: number;
}
