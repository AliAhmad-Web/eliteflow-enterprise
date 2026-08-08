/**
 * SessionHardeningService — centralized enterprise session hardening.
 * Composes SessionService; does not replace JWT/session validation.
 */

import { SessionRevokedReason } from "@enterprise/database";

import { isApiSecurityMonitoringEnabled } from "../../../config/security-flags.js";
import {
  SESSION_AUDIT_ACTIONS,
  sessionService,
} from "../../../modules/auth/session/index.js";
import { securityMonitoringService } from "../monitoring/index.js";
import { writeAuditLogSafe } from "../write-audit-log.js";
import { clearStepUp } from "../zero-trust/zero-trust.step-up.js";
import {
  getSessionHardeningPolicy,
  isSessionRiskEnabled,
  isSessionTrustedDeviceEnabled,
} from "./session-hardening.config.js";
import {
  SESSION_HARDENING_AUDIT_ACTIONS,
  SESSION_RISK_LEVELS,
} from "./session-hardening.constants.js";
import type {
  RememberDeviceInput,
  SessionHardeningContext,
  SessionHardeningPolicy,
  SessionRiskAssessment,
  SessionRiskLevel,
  SessionRiskSignals,
} from "./session-hardening.types.js";
import {
  getTrustedDevice,
  hashDeviceFingerprint,
  removeTrustedDevice,
  saveTrustedDevice,
} from "./trusted-device.store.js";

function scoreToLevel(score: number): SessionRiskLevel {
  if (score >= 80) return SESSION_RISK_LEVELS.CRITICAL;
  if (score >= 55) return SESSION_RISK_LEVELS.HIGH;
  if (score >= 30) return SESSION_RISK_LEVELS.MEDIUM;
  return SESSION_RISK_LEVELS.LOW;
}

function parseIpParts(ip: string | null | undefined): number[] | null {
  if (!ip) return null;
  // IPv4 only for subnet heuristics; IPv6 → treat as opaque string compare.
  const v4 = ip.split(".").map((p) => Number(p));
  if (v4.length === 4 && v4.every((n) => Number.isFinite(n))) return v4;
  return null;
}

/** Small IP change = same /24; larger change = different network. */
function classifyIpChange(
  sessionIp: string,
  requestIp: string | null | undefined,
): { changed: boolean; countryLikelyChanged: boolean } {
  if (!requestIp || !sessionIp) {
    return { changed: false, countryLikelyChanged: false };
  }
  if (sessionIp === requestIp) {
    return { changed: false, countryLikelyChanged: false };
  }

  const a = parseIpParts(sessionIp);
  const b = parseIpParts(requestIp);
  if (a && b) {
    const same24 = a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    if (same24) {
      return { changed: true, countryLikelyChanged: false };
    }
    const same16 = a[0] === b[0] && a[1] === b[1];
    return { changed: true, countryLikelyChanged: !same16 };
  }

  // Non-IPv4 / mixed → treat as material change.
  return { changed: true, countryLikelyChanged: true };
}

function uaBrowserPlatform(ua: string | null | undefined): {
  browser: string;
  platform: string;
  os: string;
} {
  const raw = (ua ?? "").toLowerCase();
  let browser = "unknown";
  if (raw.includes("edg/")) browser = "edge";
  else if (raw.includes("chrome/")) browser = "chrome";
  else if (raw.includes("firefox/")) browser = "firefox";
  else if (raw.includes("safari/") && !raw.includes("chrome")) browser = "safari";

  let platform = "unknown";
  if (raw.includes("mobile") || raw.includes("android") || raw.includes("iphone")) {
    platform = "mobile";
  } else if (raw.includes("tablet") || raw.includes("ipad")) {
    platform = "tablet";
  } else {
    platform = "desktop";
  }

  let os = "unknown";
  if (raw.includes("windows")) os = "windows";
  else if (raw.includes("mac os") || raw.includes("macintosh")) os = "macos";
  else if (raw.includes("android")) os = "android";
  else if (raw.includes("iphone") || raw.includes("ipad") || raw.includes("ios")) {
    os = "ios";
  } else if (raw.includes("linux")) os = "linux";

  return { browser, platform, os };
}

function deviceBindingChanged(
  sessionUa: string,
  requestUa: string | null | undefined,
): boolean {
  if (!requestUa) return false;
  const a = uaBrowserPlatform(sessionUa);
  const b = uaBrowserPlatform(requestUa);
  return (
    a.browser !== b.browser || a.platform !== b.platform || a.os !== b.os
  );
}

class SessionHardeningService {
  getPolicy(): SessionHardeningPolicy {
    return getSessionHardeningPolicy();
  }

  hashFingerprint(raw: string | null | undefined): string | null {
    return hashDeviceFingerprint(raw);
  }

  /**
   * Risk scoring after base session validation.
   * Never logs out for device/IP change alone — elevates risk.
   */
  async assess(context: SessionHardeningContext): Promise<SessionRiskAssessment> {
    if (!isSessionRiskEnabled()) {
      return {
        level: SESSION_RISK_LEVELS.LOW,
        score: 0,
        signals: {
          deviceChanged: false,
          fingerprintChanged: false,
          ipChanged: false,
          ipCountryLikelyChanged: false,
          passwordAged: false,
          mfaEnabled: context.twoFactorEnabled,
          trustedDevice: false,
          recentSecurityIncident: false,
        },
        reasons: [],
        trustedDevice: false,
      };
    }

    const reqFpHash = hashDeviceFingerprint(context.requestFingerprint);
    const fingerprintChanged = Boolean(
      context.sessionFingerprintHash &&
        reqFpHash &&
        context.sessionFingerprintHash !== reqFpHash,
    );
    const deviceChanged = deviceBindingChanged(
      context.sessionUa,
      context.requestUa,
    );
    const ip = classifyIpChange(context.sessionIp, context.requestIp);

    let trustedDevice = false;
    if (
      isSessionTrustedDeviceEnabled() &&
      reqFpHash &&
      (await getTrustedDevice(context.userId, reqFpHash))
    ) {
      trustedDevice = true;
    }

    const passwordAgeMs = context.passwordChangedAt
      ? Date.now() - context.passwordChangedAt.getTime()
      : null;
    const passwordAged =
      passwordAgeMs != null && passwordAgeMs > 180 * 24 * 60 * 60 * 1000;

    const signals: SessionRiskSignals = {
      deviceChanged,
      fingerprintChanged,
      ipChanged: ip.changed,
      ipCountryLikelyChanged: ip.countryLikelyChanged,
      passwordAged,
      mfaEnabled: context.twoFactorEnabled,
      trustedDevice,
      recentSecurityIncident: false,
    };

    let score = 0;
    const reasons: string[] = [];

    if (fingerprintChanged) {
      score += 25;
      reasons.push("device_fingerprint_changed");
    }
    if (deviceChanged) {
      score += 20;
      reasons.push("browser_platform_os_changed");
    }
    if (ip.countryLikelyChanged) {
      score += 35;
      reasons.push("ip_country_likely_changed");
    } else if (ip.changed) {
      score += 10;
      reasons.push("ip_changed_small");
    }
    if (passwordAged) {
      score += 10;
      reasons.push("password_aged");
    }
    if (!context.twoFactorEnabled) {
      score += 15;
      reasons.push("mfa_disabled");
    }
    if (trustedDevice) {
      score = Math.max(0, score - 25);
      reasons.push("trusted_device");
    }

    // Session age absolute pressure near expiry is handled by SessionService;
    // slight bump if session is older than 5 days.
    const ageDays =
      (Date.now() - context.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays >= 5) {
      score += 5;
      reasons.push("long_lived_session");
    }

    const level = scoreToLevel(score);

    await this.emitSignals(context, signals, level);

    if (
      level === SESSION_RISK_LEVELS.HIGH ||
      level === SESSION_RISK_LEVELS.CRITICAL
    ) {
      void securityMonitoringService.reportSessionRiskHigh({
        userId: context.userId,
        resource: "session",
        resourceId: context.sessionId,
        message: `Session risk ${level}`,
        metadata: { score, level, reasons, signals },
        ipAddress: context.requestIp ?? null,
        userAgent: context.requestUa ?? null,
      });

      if (isApiSecurityMonitoringEnabled()) {
        void writeAuditLogSafe(
          {
            userId: context.userId,
            action: SESSION_HARDENING_AUDIT_ACTIONS.HIGH_RISK,
            resource: "session",
            resourceId: context.sessionId,
            metadata: { score, level, reasons },
            ipAddress: context.requestIp ?? null,
            userAgent: context.requestUa ?? null,
          },
          "session-hardening",
        );
      }
    }

    if (trustedDevice) {
      void securityMonitoringService.reportTrustedDeviceUsed({
        userId: context.userId,
        resource: "session",
        resourceId: context.sessionId,
        message: "Trusted device used",
        metadata: { fingerprintBound: true },
        ipAddress: context.requestIp ?? null,
        userAgent: context.requestUa ?? null,
      });
    }

    return { level, score, signals, reasons, trustedDevice };
  }

  private async emitSignals(
    context: SessionHardeningContext,
    signals: SessionRiskSignals,
    level: SessionRiskLevel,
  ): Promise<void> {
    if (signals.deviceChanged || signals.fingerprintChanged) {
      void securityMonitoringService.reportSessionDeviceChanged({
        userId: context.userId,
        resource: "session",
        resourceId: context.sessionId,
        message: "Session device / fingerprint changed",
        metadata: {
          deviceChanged: signals.deviceChanged,
          fingerprintChanged: signals.fingerprintChanged,
          riskLevel: level,
        },
        ipAddress: context.requestIp ?? null,
        userAgent: context.requestUa ?? null,
      });
    }

    if (signals.ipChanged) {
      void securityMonitoringService.reportSessionIpChanged({
        userId: context.userId,
        resource: "session",
        resourceId: context.sessionId,
        message: signals.ipCountryLikelyChanged
          ? "Session IP country-likely changed"
          : "Session IP changed",
        metadata: {
          sessionIp: context.sessionIp,
          countryLikelyChanged: signals.ipCountryLikelyChanged,
          riskLevel: level,
        },
        ipAddress: context.requestIp ?? null,
        userAgent: context.requestUa ?? null,
      });

      if (signals.ipCountryLikelyChanged) {
        void securityMonitoringService.reportImpossibleTravelIfApplicable({
          userId: context.userId,
          resource: "session",
          resourceId: context.sessionId,
          message: "Possible geo shift inferred from IP change",
          metadata: { sessionIp: context.sessionIp },
          ipAddress: context.requestIp ?? null,
          userAgent: context.requestUa ?? null,
        });
      }
    }
  }

  /** Remember device — never bypasses authentication. */
  async rememberDevice(input: RememberDeviceInput): Promise<boolean> {
    if (!isSessionTrustedDeviceEnabled()) return false;
    const hash = hashDeviceFingerprint(input.deviceFingerprint);
    if (!hash) return false;

    await saveTrustedDevice({
      userId: input.userId,
      fingerprintHash: hash,
      label: input.label ?? null,
    });

    if (isApiSecurityMonitoringEnabled()) {
      void writeAuditLogSafe(
        {
          userId: input.userId,
          action: SESSION_HARDENING_AUDIT_ACTIONS.TRUSTED_DEVICE,
          resource: "session",
          resourceId: input.userId,
          metadata: { remembered: true },
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
        "session-hardening",
      );
    }

    return true;
  }

  async forgetDevice(
    userId: string,
    deviceFingerprint: string,
  ): Promise<void> {
    const hash = hashDeviceFingerprint(deviceFingerprint);
    if (!hash) return;
    await removeTrustedDevice(userId, hash);
  }

  /**
   * Remember by fingerprint hash (device registry already hashed).
   * Used by DeviceManagementService — never stores raw fingerprints.
   */
  async rememberTrustedFingerprintHash(input: {
    userId: string;
    fingerprintHash: string;
    label?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<boolean> {
    if (!isSessionTrustedDeviceEnabled()) return false;
    if (!input.fingerprintHash?.trim()) return false;

    await saveTrustedDevice({
      userId: input.userId,
      fingerprintHash: input.fingerprintHash,
      label: input.label ?? null,
    });

    if (isApiSecurityMonitoringEnabled()) {
      void writeAuditLogSafe(
        {
          userId: input.userId,
          action: SESSION_HARDENING_AUDIT_ACTIONS.TRUSTED_DEVICE,
          resource: "session",
          resourceId: input.userId,
          metadata: { remembered: true, source: "device_management" },
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
        "session-hardening",
      );
    }

    return true;
  }

  async forgetTrustedFingerprintHash(
    userId: string,
    fingerprintHash: string,
  ): Promise<void> {
    if (!fingerprintHash?.trim()) return;
    await removeTrustedDevice(userId, fingerprintHash);
  }

  async isTrustedDevice(
    userId: string,
    deviceFingerprint: string | null | undefined,
  ): Promise<boolean> {
    if (!isSessionTrustedDeviceEnabled()) return false;
    const hash = hashDeviceFingerprint(deviceFingerprint);
    if (!hash) return false;
    return Boolean(await getTrustedDevice(userId, hash));
  }

  /**
   * Trusted devices reduce MFA / step-up prompts — never skip auth.
   */
  async shouldReduceMfaPrompt(
    userId: string,
    deviceFingerprint: string | null | undefined,
  ): Promise<boolean> {
    return this.isTrustedDevice(userId, deviceFingerprint);
  }

  async rotateAfterPasswordChange(input: {
    userId: string;
    currentSessionId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await sessionService.revokeAllSessions({
      userId: input.userId,
      exceptSessionId: input.currentSessionId,
      reason: SessionRevokedReason.PASSWORD_CHANGE,
      actorUserId: input.userId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      auditAction: SESSION_AUDIT_ACTIONS.PASSWORD_CHANGED,
    });
    await sessionService.rebindSessionAfterCredentialChange(
      input.currentSessionId,
    );
    clearStepUp(input.currentSessionId);
    await this.auditRotation(input, "password_change");
  }

  async rotateAfterMfaEnable(input: {
    userId: string;
    currentSessionId?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await sessionService.revokeAllSessions({
      userId: input.userId,
      exceptSessionId: input.currentSessionId,
      reason: SessionRevokedReason.MFA_RESET,
      actorUserId: input.userId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      auditAction: SESSION_AUDIT_ACTIONS.MFA_INVALID,
      metadata: { flow: "mfa_enable" },
    });
    if (input.currentSessionId) {
      await sessionService.rebindSessionAfterCredentialChange(
        input.currentSessionId,
      );
      clearStepUp(input.currentSessionId);
    }
    await this.auditRotation(input, "mfa_enable");
  }

  async rotateAfterMfaDisable(input: {
    userId: string;
    currentSessionId?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await sessionService.revokeAllSessions({
      userId: input.userId,
      reason: SessionRevokedReason.MFA_RESET,
      actorUserId: input.userId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      auditAction: SESSION_AUDIT_ACTIONS.MFA_INVALID,
      metadata: {
        flow: "mfa_disable",
        currentSessionId: input.currentSessionId ?? null,
      },
    });
    if (input.currentSessionId) {
      clearStepUp(input.currentSessionId);
    }
    await this.auditRotation(input, "mfa_disable", true);
  }

  async rotateAfterPrivilegeChange(input: {
    userId: string;
    currentSessionId?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    previousRole?: string;
    nextRole?: string;
  }): Promise<void> {
    await sessionService.revokeAllSessions({
      userId: input.userId,
      exceptSessionId: input.currentSessionId,
      reason: SessionRevokedReason.ADMIN_REVOKE,
      actorUserId: input.userId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      auditAction: SESSION_AUDIT_ACTIONS.REVOKED_ADMIN,
      metadata: {
        flow: "privilege_change",
        previousRole: input.previousRole ?? null,
        nextRole: input.nextRole ?? null,
      },
    });
    if (input.currentSessionId) {
      await sessionService.rebindSessionAfterCredentialChange(
        input.currentSessionId,
      );
      clearStepUp(input.currentSessionId);
    }
    await this.auditRotation(input, "privilege_change", true);
  }

  async reportSessionLimitExceeded(input: {
    userId: string;
    sessionId?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    void securityMonitoringService.reportSessionLimitExceeded({
      userId: input.userId,
      resource: "session",
      resourceId: input.sessionId ?? input.userId,
      message: "Concurrent session limit exceeded — oldest revoked",
      metadata: {
        max: this.getPolicy().maxConcurrentSessions,
      },
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    if (isApiSecurityMonitoringEnabled()) {
      void writeAuditLogSafe(
        {
          userId: input.userId,
          action: SESSION_HARDENING_AUDIT_ACTIONS.FORCED_REVOCATION,
          resource: "session",
          resourceId: input.sessionId ?? input.userId,
          metadata: { reason: "session_limit_exceeded" },
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
        "session-hardening",
      );
    }
  }

  private async auditRotation(
    input: {
      userId: string;
      currentSessionId?: string;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
    flow: string,
    forced = false,
  ): Promise<void> {
    void securityMonitoringService.reportSessionRotated({
      userId: input.userId,
      resource: "session",
      resourceId: input.currentSessionId ?? input.userId,
      message: `Session rotated after ${flow}`,
      metadata: { flow },
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    if (isApiSecurityMonitoringEnabled()) {
      void writeAuditLogSafe(
        {
          userId: input.userId,
          action: forced
            ? SESSION_HARDENING_AUDIT_ACTIONS.FORCED_REVOCATION
            : SESSION_HARDENING_AUDIT_ACTIONS.ROTATED,
          resource: "session",
          resourceId: input.currentSessionId ?? input.userId,
          metadata: { flow },
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
        "session-hardening",
      );
    }
  }
}

export const sessionHardeningService = new SessionHardeningService();
