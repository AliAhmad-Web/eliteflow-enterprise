/**
 * Device risk detection — impossible device, flood, switching, attribute drift.
 */

import { DEVICE_RISK_SIGNALS, DEVICE_STATES } from "./device-management.constants.js";
import { getDeviceManagementPolicy } from "./device-management.config.js";
import type {
  DeviceRecord,
  DeviceRiskAssessment,
  DeviceRiskSignal,
  DeviceState,
} from "./device-management.types.js";

/** userId → recent registration timestamps */
const registrationTimestamps = new Map<string, number[]>();
/** userId → recent distinct deviceId switches */
const switchTimestamps = new Map<string, Array<{ deviceId: string; at: number }>>();

function trimWindow(times: number[], windowMs: number, now: number): number[] {
  return times.filter((t) => now - t <= windowMs);
}

export function recordRegistrationEvent(userId: string): number {
  const policy = getDeviceManagementPolicy();
  const now = Date.now();
  const prev = registrationTimestamps.get(userId) ?? [];
  const next = trimWindow([...prev, now], policy.deviceFloodWindowMs, now);
  registrationTimestamps.set(userId, next);
  return next.length;
}

export function recordDeviceSwitch(userId: string, deviceId: string): number {
  const policy = getDeviceManagementPolicy();
  const now = Date.now();
  const prev = switchTimestamps.get(userId) ?? [];
  const trimmed = prev.filter((e) => now - e.at <= policy.rapidSwitchWindowMs);
  const last = trimmed[trimmed.length - 1];
  if (!last || last.deviceId !== deviceId) {
    trimmed.push({ deviceId, at: now });
  }
  switchTimestamps.set(userId, trimmed);
  const distinct = new Set(trimmed.map((e) => e.deviceId));
  return distinct.size;
}

function parseIpParts(ip: string | null | undefined): number[] | null {
  if (!ip) return null;
  const v4 = ip.split(".").map((p) => Number(p));
  if (v4.length === 4 && v4.every((n) => Number.isFinite(n))) return v4;
  return null;
}

/** Heuristic: large IP jump without matching country → impossible travel/device. */
function isImpossibleDevice(
  previousIp: string | null | undefined,
  nextIp: string | null | undefined,
  previousCountry: string | null | undefined,
  nextCountry: string | null | undefined,
  elapsedMs: number,
): boolean {
  if (!previousIp || !nextIp || previousIp === nextIp) return false;
  // Same /16 within 1 hour is fine; cross-/8 within 5 minutes is suspicious.
  if (elapsedMs > 5 * 60 * 1000) return false;

  if (
    previousCountry &&
    nextCountry &&
    previousCountry.toUpperCase() !== nextCountry.toUpperCase()
  ) {
    return true;
  }

  const a = parseIpParts(previousIp);
  const b = parseIpParts(nextIp);
  if (a && b) {
    const same16 = a[0] === b[0] && a[1] === b[1];
    return !same16;
  }
  return previousIp !== nextIp;
}

export function assessDeviceRisk(input: {
  existing: DeviceRecord | null;
  nextFingerprintHash: string | null;
  nextBrowser: string;
  nextOs: string;
  nextIp: string | null;
  nextCountry: string | null;
  registrationCountInWindow: number;
  distinctDevicesInWindow: number;
  isUnknown: boolean;
}): DeviceRiskAssessment {
  const policy = getDeviceManagementPolicy();
  const signals: DeviceRiskSignal[] = [];
  let score = 0;

  const { existing } = input;

  if (existing?.blocked || existing?.state === DEVICE_STATES.BLOCKED) {
    signals.push(DEVICE_RISK_SIGNALS.BLOCKED_DEVICE);
    score += 100;
  }

  if (input.isUnknown) {
    score += 15;
  }

  if (
    existing?.fingerprintHash &&
    input.nextFingerprintHash &&
    existing.fingerprintHash !== input.nextFingerprintHash
  ) {
    signals.push(DEVICE_RISK_SIGNALS.FINGERPRINT_CHANGED);
    score += 30;
  }

  if (
    existing &&
    existing.browser !== "unknown" &&
    input.nextBrowser !== "unknown" &&
    existing.browser.toLowerCase() !== input.nextBrowser.toLowerCase()
  ) {
    signals.push(DEVICE_RISK_SIGNALS.BROWSER_CHANGED);
    score += 20;
  }

  if (
    existing &&
    existing.operatingSystem !== "unknown" &&
    input.nextOs !== "unknown" &&
    existing.operatingSystem.toLowerCase() !== input.nextOs.toLowerCase()
  ) {
    signals.push(DEVICE_RISK_SIGNALS.OS_CHANGED);
    score += 25;
  }

  if (
    existing?.country &&
    input.nextCountry &&
    existing.country.toUpperCase() !== input.nextCountry.toUpperCase()
  ) {
    signals.push(DEVICE_RISK_SIGNALS.COUNTRY_CHANGED);
    score += 35;
  }

  const lastIp = existing?.ipHistory[existing.ipHistory.length - 1]?.ipAddress;
  if (
    existing &&
    isImpossibleDevice(
      lastIp,
      input.nextIp,
      existing.country,
      input.nextCountry,
      Date.now() - existing.lastSeenAt,
    )
  ) {
    signals.push(DEVICE_RISK_SIGNALS.IMPOSSIBLE_DEVICE);
    score += 40;
  }

  if (input.registrationCountInWindow >= policy.deviceFloodThreshold) {
    signals.push(DEVICE_RISK_SIGNALS.DEVICE_FLOOD);
    score += 45;
  }

  if (input.distinctDevicesInWindow >= policy.rapidSwitchThreshold) {
    signals.push(DEVICE_RISK_SIGNALS.RAPID_DEVICE_SWITCHING);
    score += 35;
  }

  if (score >= policy.highRiskScoreThreshold) {
    if (!signals.includes(DEVICE_RISK_SIGNALS.HIGH_RISK_DEVICE)) {
      signals.push(DEVICE_RISK_SIGNALS.HIGH_RISK_DEVICE);
    }
  }

  score = Math.min(100, score);

  let stateHint: DeviceState | null = null;
  if (signals.includes(DEVICE_RISK_SIGNALS.BLOCKED_DEVICE)) {
    stateHint = DEVICE_STATES.BLOCKED;
  } else if (
    signals.includes(DEVICE_RISK_SIGNALS.IMPOSSIBLE_DEVICE) ||
    signals.includes(DEVICE_RISK_SIGNALS.DEVICE_FLOOD) ||
    signals.includes(DEVICE_RISK_SIGNALS.HIGH_RISK_DEVICE)
  ) {
    stateHint = DEVICE_STATES.SUSPICIOUS;
  }

  return { score, signals, stateHint };
}
