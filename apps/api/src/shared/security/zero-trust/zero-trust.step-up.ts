import { ZERO_TRUST_STEP_UP_TTL_MS } from "./zero-trust.policies.js";

interface StepUpRecord {
  verifiedAt: number;
  expiresAt: number;
}

/** In-process step-up MFA cache keyed by sessionId (no second MFA system). */
const stepUpBySession = new Map<string, StepUpRecord>();

export function markStepUpVerified(sessionId: string, now = Date.now()): void {
  stepUpBySession.set(sessionId, {
    verifiedAt: now,
    expiresAt: now + ZERO_TRUST_STEP_UP_TTL_MS,
  });
}

export function clearStepUp(sessionId: string): void {
  stepUpBySession.delete(sessionId);
}

export function getStepUpStatus(sessionId: string, now = Date.now()): {
  active: boolean;
  expiresAt: string | null;
} {
  const record = stepUpBySession.get(sessionId);
  if (!record) {
    return { active: false, expiresAt: null };
  }
  if (record.expiresAt <= now) {
    stepUpBySession.delete(sessionId);
    return { active: false, expiresAt: null };
  }
  return {
    active: true,
    expiresAt: new Date(record.expiresAt).toISOString(),
  };
}

export function hasValidStepUp(sessionId: string, now = Date.now()): boolean {
  return getStepUpStatus(sessionId, now).active;
}
