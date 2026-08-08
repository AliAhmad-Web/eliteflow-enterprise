/**
 * Device Management configuration.
 *
 * Env:
 * - SECURITY_DEVICE_MANAGEMENT (default ON)
 * - DEVICE_MAX_PER_USER (default 10)
 * - DEVICE_INACTIVE_TIMEOUT_DAYS (default 30)
 * - DEVICE_AUTO_CLEANUP (default ON)
 * - DEVICE_UNKNOWN_DETECTION (default ON)
 * - DEVICE_BLOCKED_ENFORCEMENT (default ON)
 * - DEVICE_FINGERPRINT_VALIDATION (default ON)
 */

import type { DeviceManagementPolicy } from "./device-management.types.js";

function parseEnvFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return defaultValue;
  switch (normalized) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return defaultValue;
  }
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

let cached: DeviceManagementPolicy | null = null;

export function getDeviceManagementPolicy(): DeviceManagementPolicy {
  if (cached) return cached;
  cached = {
    enabled: parseEnvFlag(
      process.env.SECURITY_DEVICE_MANAGEMENT ??
        process.env.DEVICE_MANAGEMENT_ENABLED,
      true,
    ),
    maxDevicesPerUser: parsePositiveInt(process.env.DEVICE_MAX_PER_USER, 10),
    inactiveTimeoutDays: parsePositiveInt(
      process.env.DEVICE_INACTIVE_TIMEOUT_DAYS,
      30,
    ),
    autoCleanupEnabled: parseEnvFlag(process.env.DEVICE_AUTO_CLEANUP, true),
    unknownDeviceDetection: parseEnvFlag(
      process.env.DEVICE_UNKNOWN_DETECTION,
      true,
    ),
    blockedDeviceEnforcement: parseEnvFlag(
      process.env.DEVICE_BLOCKED_ENFORCEMENT,
      true,
    ),
    fingerprintValidation: parseEnvFlag(
      process.env.DEVICE_FINGERPRINT_VALIDATION,
      true,
    ),
    deviceFloodWindowMs: parsePositiveInt(
      process.env.DEVICE_FLOOD_WINDOW_MS,
      15 * 60 * 1000,
    ),
    deviceFloodThreshold: parsePositiveInt(
      process.env.DEVICE_FLOOD_THRESHOLD,
      5,
    ),
    rapidSwitchWindowMs: parsePositiveInt(
      process.env.DEVICE_RAPID_SWITCH_WINDOW_MS,
      10 * 60 * 1000,
    ),
    rapidSwitchThreshold: parsePositiveInt(
      process.env.DEVICE_RAPID_SWITCH_THRESHOLD,
      4,
    ),
    highRiskScoreThreshold: parsePositiveInt(
      process.env.DEVICE_HIGH_RISK_SCORE,
      70,
    ),
  };
  return cached;
}

export function isDeviceManagementEnabled(): boolean {
  return getDeviceManagementPolicy().enabled;
}

export function resetDeviceManagementConfigCache(): void {
  cached = null;
}
