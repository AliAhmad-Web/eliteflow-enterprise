/**
 * DeviceManagementService — centralized enterprise device registry.
 *
 * Pipeline: Authentication → SessionService → Device Management
 * Does not replace JWT, SessionService, or authentication.
 * Trusted devices only reduce MFA prompts (via session-hardening).
 */

import { UAParser } from "ua-parser-js";
import { Prisma } from "@enterprise/database";

import { AuthRepository } from "../../../modules/auth/auth.repository.js";
import { mfaService } from "../../../modules/auth/mfa/index.js";
import { isApiSecurityMonitoringEnabled } from "../../../config/security-flags.js";
import { logger } from "../logger.js";
import {
  securityMonitoringService,
  THREAT_DETECTION_TYPES,
} from "../monitoring/index.js";
import { sessionHardeningService } from "../session-hardening/index.js";
import { writeAuditLogSafe } from "../write-audit-log.js";
import {
  getDeviceManagementPolicy,
  isDeviceManagementEnabled,
} from "./device-management.config.js";
import {
  DEVICE_AUDIT_ACTIONS,
  DEVICE_MONITORING_EVENTS,
  DEVICE_STATES,
  DEVICE_TYPES,
} from "./device-management.constants.js";
import type {
  DeviceActionInput,
  DeviceManagementDashboardMetrics,
  DeviceRecord,
  DeviceType,
  ManagedDeviceDto,
  ObserveDeviceInput,
  RegisterDeviceInput,
  RenameDeviceInput,
  TrustDeviceInput,
} from "./device-management.types.js";
import {
  appendIpHistory,
  createDeviceId,
  deleteDevice,
  getDeviceByFingerprint,
  getDeviceById,
  hashFingerprint,
  listAllDevices,
  listDevicesByUser,
  saveDevice,
} from "./device-registry.store.js";
import {
  assessDeviceRisk,
  recordDeviceSwitch,
  recordRegistrationEvent,
} from "./device-risk.service.js";

const authRepository = new AuthRepository();

function parseUa(userAgent: string | null | undefined): {
  browser: string;
  platform: string;
  operatingSystem: string;
  deviceType: DeviceType;
  label: string;
} {
  const ua = userAgent?.trim() || "unknown";
  if (ua === "unknown") {
    return {
      browser: "unknown",
      platform: "unknown",
      operatingSystem: "unknown",
      deviceType: DEVICE_TYPES.UNKNOWN,
      label: "Unknown Device",
    };
  }

  const parser = new UAParser(ua);
  const result = parser.getResult();
  const browserName = result.browser.name ?? "Browser";
  const browserMajor =
    result.browser.major ?? result.browser.version?.split(".")[0];
  const browser = browserMajor ? `${browserName} ${browserMajor}` : browserName;

  const osName = result.os.name ?? "Unknown OS";
  const osVersion = result.os.version ?? "";
  const operatingSystem = osVersion ? `${osName} ${osVersion}` : osName;

  const rawType = (result.device.type ?? "").toLowerCase();
  const uaLower = ua.toLowerCase();
  let deviceType: DeviceType = DEVICE_TYPES.BROWSER;
  if (rawType === "mobile" || uaLower.includes("mobile")) {
    deviceType = DEVICE_TYPES.MOBILE;
  } else if (rawType === "tablet" || uaLower.includes("ipad")) {
    deviceType = DEVICE_TYPES.TABLET;
  } else if (uaLower.includes("laptop")) {
    deviceType = DEVICE_TYPES.LAPTOP;
  } else if (
    rawType === "" ||
    rawType === "desktop" ||
    uaLower.includes("windows") ||
    uaLower.includes("macintosh") ||
    uaLower.includes("linux")
  ) {
    deviceType = DEVICE_TYPES.DESKTOP;
  }

  const platform =
    deviceType === DEVICE_TYPES.MOBILE
      ? "mobile"
      : deviceType === DEVICE_TYPES.TABLET
        ? "tablet"
        : "desktop";

  const model = [result.device.vendor, result.device.model]
    .filter(Boolean)
    .join(" ");
  const label = model || `${browserName} on ${osName}`;

  return {
    browser: browser.slice(0, 100),
    platform,
    operatingSystem: operatingSystem.slice(0, 100),
    deviceType,
    label: label.slice(0, 200),
  };
}

function toDto(record: DeviceRecord): ManagedDeviceDto {
  const lastIp =
    record.ipHistory[record.ipHistory.length - 1]?.ipAddress ?? null;
  return {
    id: record.id,
    userId: record.userId,
    label: record.label,
    deviceType: record.deviceType,
    browser: record.browser,
    platform: record.platform,
    operatingSystem: record.operatingSystem,
    userAgent: record.userAgent.slice(0, 512),
    lastIpAddress: lastIp,
    country: record.country,
    city: record.city,
    timezone: record.timezone,
    firstSeenAt: new Date(record.firstSeenAt).toISOString(),
    lastSeenAt: new Date(record.lastSeenAt).toISOString(),
    riskScore: record.riskScore,
    riskSignals: record.riskSignals,
    state: record.state,
    trusted: record.trusted,
    blocked: record.blocked,
    fingerprintBound: Boolean(record.fingerprintHash),
  };
}

function emitDeviceEvent(
  type: (typeof DEVICE_MONITORING_EVENTS)[keyof typeof DEVICE_MONITORING_EVENTS],
  input: {
    userId: string;
    deviceId: string;
    message: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): void {
  void securityMonitoringService.reportDeviceEvent({
    type: type as
      | typeof THREAT_DETECTION_TYPES.DEVICE_REGISTERED
      | typeof THREAT_DETECTION_TYPES.DEVICE_TRUSTED
      | typeof THREAT_DETECTION_TYPES.DEVICE_REMOVED
      | typeof THREAT_DETECTION_TYPES.DEVICE_BLOCKED
      | typeof THREAT_DETECTION_TYPES.DEVICE_REVOKED
      | typeof THREAT_DETECTION_TYPES.DEVICE_SUSPICIOUS
      | typeof THREAT_DETECTION_TYPES.UNKNOWN_DEVICE
      | typeof THREAT_DETECTION_TYPES.DEVICE_LIMIT_EXCEEDED
      | typeof THREAT_DETECTION_TYPES.DEVICE_POLICY_VIOLATION,
    userId: input.userId,
    resource: "device",
    resourceId: input.deviceId,
    message: input.message,
    metadata: {
      ...input.metadata,
      sanitized: true,
    },
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });
}

class DeviceManagementService {
  getPolicy() {
    return getDeviceManagementPolicy();
  }

  isEnabled(): boolean {
    return isDeviceManagementEnabled();
  }

  toSanitizedDto(record: DeviceRecord): ManagedDeviceDto {
    return toDto(record);
  }

  /**
   * Auto-register / upsert device on session creation.
   * Fire-and-forget safe — never throws to auth callers.
   */
  async registerDevice(
    input: RegisterDeviceInput,
  ): Promise<ManagedDeviceDto | null> {
    try {
      if (!isDeviceManagementEnabled()) return null;

      const policy = getDeviceManagementPolicy();
      const now = Date.now();
      const ua = parseUa(input.userAgent);
      const fpHash = hashFingerprint(input.deviceFingerprint);
      const isUnknown = !fpHash && policy.unknownDeviceDetection;

      let existing: DeviceRecord | null = null;
      if (fpHash) {
        existing = await getDeviceByFingerprint(input.userId, fpHash);
      }

      const registrationCount = existing
        ? 0
        : recordRegistrationEvent(input.userId);

      if (!existing) {
        const userDevices = await listDevicesByUser(input.userId);
        const activeCount = userDevices.filter(
          (d) =>
            d.state !== DEVICE_STATES.REVOKED &&
            d.state !== DEVICE_STATES.BLOCKED,
        ).length;
        if (activeCount >= policy.maxDevicesPerUser) {
          emitDeviceEvent(DEVICE_MONITORING_EVENTS.DEVICE_LIMIT_EXCEEDED, {
            userId: input.userId,
            deviceId: "limit",
            message: "Maximum devices per user exceeded",
            metadata: {
              maxDevicesPerUser: policy.maxDevicesPerUser,
              activeCount,
            },
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
          });
          emitDeviceEvent(DEVICE_MONITORING_EVENTS.DEVICE_POLICY_VIOLATION, {
            userId: input.userId,
            deviceId: "limit",
            message: "Device policy violation: max devices",
            metadata: { policy: "maxDevicesPerUser" },
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
          });
          // Evict oldest inactive/non-trusted to stay within policy
          await this.evictOldestIfNeeded(input.userId);
        }
      }

      const distinctSwitches = recordDeviceSwitch(
        input.userId,
        existing?.id ?? "new",
      );

      const risk = assessDeviceRisk({
        existing,
        nextFingerprintHash: fpHash,
        nextBrowser: ua.browser,
        nextOs: ua.operatingSystem,
        nextIp: input.ipAddress ?? null,
        nextCountry: input.country ?? null,
        registrationCountInWindow: registrationCount,
        distinctDevicesInWindow: distinctSwitches,
        isUnknown,
      });

      if (existing) {
        if (
          existing.blocked ||
          existing.state === DEVICE_STATES.BLOCKED ||
          existing.state === DEVICE_STATES.REVOKED
        ) {
          emitDeviceEvent(DEVICE_MONITORING_EVENTS.DEVICE_POLICY_VIOLATION, {
            userId: input.userId,
            deviceId: existing.id,
            message: `Blocked/revoked device attempted registration (${existing.state})`,
            metadata: { state: existing.state },
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
          });
          return toDto(existing);
        }

        existing.lastSeenAt = now;
        existing.browser = ua.browser;
        existing.platform = ua.platform;
        existing.operatingSystem = ua.operatingSystem;
        existing.userAgent = (input.userAgent ?? existing.userAgent).slice(
          0,
          1024,
        );
        existing.deviceType = ua.deviceType;
        if (input.country != null) existing.country = input.country;
        if (input.city != null) existing.city = input.city;
        if (input.timezone != null) existing.timezone = input.timezone;
        if (input.sessionId) existing.sessionId = input.sessionId;
        appendIpHistory(
          existing,
          input.ipAddress,
          input.country,
          input.city,
        );
        existing.riskScore = Math.max(existing.riskScore, risk.score);
        existing.riskSignals = risk.signals;
        if (
          risk.stateHint === DEVICE_STATES.SUSPICIOUS &&
          existing.state !== DEVICE_STATES.TRUSTED
        ) {
          existing.state = DEVICE_STATES.SUSPICIOUS;
          emitDeviceEvent(DEVICE_MONITORING_EVENTS.DEVICE_SUSPICIOUS, {
            userId: input.userId,
            deviceId: existing.id,
            message: "Device marked suspicious",
            metadata: { signals: risk.signals, score: risk.score },
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
          });
        } else if (
          existing.state === DEVICE_STATES.INACTIVE ||
          existing.state === DEVICE_STATES.NEW
        ) {
          existing.state = existing.trusted
            ? DEVICE_STATES.TRUSTED
            : DEVICE_STATES.ACTIVE;
        }
        await saveDevice(existing);
        return toDto(existing);
      }

      const record: DeviceRecord = {
        id: createDeviceId(),
        userId: input.userId,
        fingerprintHash: fpHash,
        label: input.label ?? ua.label,
        deviceType: ua.deviceType,
        browser: ua.browser,
        platform: ua.platform,
        operatingSystem: ua.operatingSystem,
        userAgent: (input.userAgent ?? "unknown").slice(0, 1024),
        ipHistory: [],
        country: input.country ?? null,
        city: input.city ?? null,
        timezone: input.timezone ?? null,
        firstSeenAt: now,
        lastSeenAt: now,
        riskScore: risk.score,
        riskSignals: risk.signals,
        state:
          risk.stateHint === DEVICE_STATES.SUSPICIOUS
            ? DEVICE_STATES.SUSPICIOUS
            : isUnknown
              ? DEVICE_STATES.NEW
              : DEVICE_STATES.NEW,
        trusted: false,
        blocked: false,
        sessionId: input.sessionId ?? null,
      };
      appendIpHistory(record, input.ipAddress, input.country, input.city);
      await saveDevice(record);

      emitDeviceEvent(DEVICE_MONITORING_EVENTS.DEVICE_REGISTERED, {
        userId: input.userId,
        deviceId: record.id,
        message: "Device registered",
        metadata: {
          deviceType: record.deviceType,
          state: record.state,
          fingerprintBound: Boolean(fpHash),
        },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });

      if (isUnknown) {
        emitDeviceEvent(DEVICE_MONITORING_EVENTS.UNKNOWN_DEVICE, {
          userId: input.userId,
          deviceId: record.id,
          message: "Unknown device (no fingerprint)",
          metadata: { deviceType: record.deviceType },
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        });
      }

      if (record.state === DEVICE_STATES.SUSPICIOUS) {
        emitDeviceEvent(DEVICE_MONITORING_EVENTS.DEVICE_SUSPICIOUS, {
          userId: input.userId,
          deviceId: record.id,
          message: "New device scored suspicious",
          metadata: { signals: risk.signals, score: risk.score },
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        });
      }

      if (isApiSecurityMonitoringEnabled()) {
        void writeAuditLogSafe(
          {
            userId: input.userId,
            action: DEVICE_AUDIT_ACTIONS.REGISTERED,
            resource: "device",
            resourceId: record.id,
            metadata: {
              deviceType: record.deviceType,
              state: record.state,
            },
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
          },
          "device-management",
        );
      }

      return toDto(record);
    } catch (error) {
      logger.error("[device-management] registerDevice failed:", error);
      return null;
    }
  }

  /**
   * Observe device on authenticated request (touch lastSeen + risk).
   * Fire-and-forget safe.
   */
  async observeDevice(
    input: ObserveDeviceInput,
  ): Promise<ManagedDeviceDto | null> {
    try {
      if (!isDeviceManagementEnabled()) return null;

      const fpHash = hashFingerprint(input.deviceFingerprint);
      let existing: DeviceRecord | null = null;
      if (fpHash) {
        existing = await getDeviceByFingerprint(input.userId, fpHash);
      }

      if (!existing) {
        return this.registerDevice(input);
      }

      if (
        existing.blocked ||
        existing.state === DEVICE_STATES.BLOCKED ||
        existing.state === DEVICE_STATES.REVOKED
      ) {
        emitDeviceEvent(DEVICE_MONITORING_EVENTS.DEVICE_POLICY_VIOLATION, {
          userId: input.userId,
          deviceId: existing.id,
          message: `Blocked/revoked device observed (${existing.state})`,
          metadata: { state: existing.state },
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        });
        return toDto(existing);
      }

      const ua = parseUa(input.userAgent);
      const distinctSwitches = recordDeviceSwitch(input.userId, existing.id);
      const risk = assessDeviceRisk({
        existing,
        nextFingerprintHash: fpHash,
        nextBrowser: ua.browser,
        nextOs: ua.operatingSystem,
        nextIp: input.ipAddress ?? null,
        nextCountry: input.country ?? null,
        registrationCountInWindow: 0,
        distinctDevicesInWindow: distinctSwitches,
        isUnknown: !fpHash,
      });

      existing.lastSeenAt = Date.now();
      if (input.sessionId) existing.sessionId = input.sessionId;
      if (input.country != null) existing.country = input.country;
      if (input.city != null) existing.city = input.city;
      if (input.timezone != null) existing.timezone = input.timezone;
      appendIpHistory(existing, input.ipAddress, input.country, input.city);
      existing.riskScore = Math.max(existing.riskScore, risk.score);
      existing.riskSignals = risk.signals;

      if (
        risk.stateHint === DEVICE_STATES.SUSPICIOUS &&
        !existing.trusted
      ) {
        existing.state = DEVICE_STATES.SUSPICIOUS;
        emitDeviceEvent(DEVICE_MONITORING_EVENTS.DEVICE_SUSPICIOUS, {
          userId: input.userId,
          deviceId: existing.id,
          message: "Device marked suspicious on observe",
          metadata: { signals: risk.signals, score: risk.score },
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        });
      } else if (
        existing.state === DEVICE_STATES.INACTIVE ||
        existing.state === DEVICE_STATES.NEW
      ) {
        existing.state = existing.trusted
          ? DEVICE_STATES.TRUSTED
          : DEVICE_STATES.ACTIVE;
      }

      await saveDevice(existing);
      return toDto(existing);
    } catch (error) {
      logger.error("[device-management] observeDevice failed:", error);
      return null;
    }
  }

  async listDevices(options?: {
    userId?: string;
  }): Promise<ManagedDeviceDto[]> {
    if (!isDeviceManagementEnabled()) return [];
    await this.cleanupInactive();
    const records = options?.userId
      ? await listDevicesByUser(options.userId)
      : await listAllDevices();
    return records.map(toDto);
  }

  async getDevice(deviceId: string): Promise<ManagedDeviceDto | null> {
    const record = await getDeviceById(deviceId);
    return record ? toDto(record) : null;
  }

  async listDevicesForUser(userId: string): Promise<ManagedDeviceDto[]> {
    return this.listDevices({ userId });
  }

  /**
   * Trust device — requires MFA. Never bypasses authentication.
   * Only reduces future MFA / step-up prompts via session-hardening.
   */
  async trustDevice(input: TrustDeviceInput): Promise<ManagedDeviceDto> {
    if (!isDeviceManagementEnabled()) {
      throw new DeviceManagementError("Device management is disabled", 503);
    }

    const record = await getDeviceById(input.deviceId);
    if (!record) {
      throw new DeviceManagementError("Device not found", 404);
    }
    if (record.userId !== input.actorUserId) {
      // Admin may trust on behalf only if same user ownership enforced for MFA
      // Trust always requires the device owner's MFA — actor must own device.
      throw new DeviceManagementError(
        "Only the device owner can trust a device (MFA required)",
        403,
      );
    }
    if (record.blocked || record.state === DEVICE_STATES.BLOCKED) {
      throw new DeviceManagementError("Cannot trust a blocked device", 400);
    }
    if (record.state === DEVICE_STATES.REVOKED) {
      throw new DeviceManagementError("Cannot trust a revoked device", 400);
    }

    const user = await authRepository.findUserById(input.actorUserId);
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      throw new DeviceManagementError(
        "MFA must be enabled to trust a device",
        400,
      );
    }

    const recoveryCodes = mfaService.parseRecoveryCodes(user.recoveryCodes);

    const verified = await mfaService.verifyLoginFactor({
      encryptedSecret: user.twoFactorSecret,
      recoveryCodes,
      lastStep: user.twoFactorLastStep ?? null,
      code: input.mfaCode,
    });

    if (!verified.ok) {
      void securityMonitoringService.reportMfaFailure({
        userId: input.actorUserId,
        resource: "device",
        resourceId: input.deviceId,
        message: "MFA failed while trusting device",
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      throw new DeviceManagementError("Invalid MFA code", 401);
    }

    if (verified.method === "totp") {
      await authRepository.updateUserMfa(input.actorUserId, {
        twoFactorLastStep: verified.step,
      });
    } else if (verified.method === "recovery") {
      await authRepository.updateUserMfa(input.actorUserId, {
        recoveryCodes:
          verified.updatedRecoveryCodes as unknown as Prisma.InputJsonValue,
      });
    }

    record.trusted = true;
    record.state = DEVICE_STATES.TRUSTED;
    record.blocked = false;
    if (input.label?.trim()) {
      record.label = input.label.trim().slice(0, 200);
    }
    record.lastSeenAt = Date.now();
    await saveDevice(record);

    // Sync session-hardening trusted store (MFA prompt reduction only).
    if (record.fingerprintHash) {
      // rememberDevice expects raw fingerprint; we only have hash.
      // Bridge: mark via session-hardening using a synthetic remember of the hash-as-token
      // is wrong. Instead call saveTrustedDevice path through a dedicated hash API.
      await sessionHardeningService.rememberTrustedFingerprintHash({
        userId: record.userId,
        fingerprintHash: record.fingerprintHash,
        label: record.label,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
    }

    emitDeviceEvent(DEVICE_MONITORING_EVENTS.DEVICE_TRUSTED, {
      userId: record.userId,
      deviceId: record.id,
      message: "Device trusted after MFA",
      metadata: { state: record.state },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    if (isApiSecurityMonitoringEnabled()) {
      void writeAuditLogSafe(
        {
          userId: input.actorUserId,
          action: DEVICE_AUDIT_ACTIONS.TRUSTED,
          resource: "device",
          resourceId: record.id,
          metadata: { trusted: true },
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
        "device-management",
      );
    }

    return toDto(record);
  }

  async renameDevice(input: RenameDeviceInput): Promise<ManagedDeviceDto> {
    const record = await getDeviceById(input.deviceId);
    if (!record) {
      throw new DeviceManagementError("Device not found", 404);
    }
    if (record.userId !== input.actorUserId) {
      throw new DeviceManagementError("Forbidden", 403);
    }
    record.label = input.label.trim().slice(0, 200);
    await saveDevice(record);

    if (isApiSecurityMonitoringEnabled()) {
      void writeAuditLogSafe(
        {
          userId: input.actorUserId,
          action: DEVICE_AUDIT_ACTIONS.RENAMED,
          resource: "device",
          resourceId: record.id,
          metadata: { label: record.label },
          ipAddress: null,
          userAgent: null,
        },
        "device-management",
      );
    }

    return toDto(record);
  }

  async blockDevice(input: DeviceActionInput): Promise<ManagedDeviceDto> {
    const record = await getDeviceById(input.deviceId);
    if (!record) {
      throw new DeviceManagementError("Device not found", 404);
    }

    record.blocked = true;
    record.trusted = false;
    record.state = DEVICE_STATES.BLOCKED;
    record.lastSeenAt = Date.now();
    await saveDevice(record);

    if (record.fingerprintHash) {
      await sessionHardeningService.forgetTrustedFingerprintHash(
        record.userId,
        record.fingerprintHash,
      );
    }

    emitDeviceEvent(DEVICE_MONITORING_EVENTS.DEVICE_BLOCKED, {
      userId: record.userId,
      deviceId: record.id,
      message: input.reason ?? "Device blocked",
      metadata: { reason: input.reason ?? null },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    if (isApiSecurityMonitoringEnabled()) {
      void writeAuditLogSafe(
        {
          userId: input.actorUserId,
          action: DEVICE_AUDIT_ACTIONS.BLOCKED,
          resource: "device",
          resourceId: record.id,
          metadata: { reason: input.reason ?? null },
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
        "device-management",
      );
    }

    return toDto(record);
  }

  async revokeDevice(input: DeviceActionInput): Promise<ManagedDeviceDto> {
    const record = await getDeviceById(input.deviceId);
    if (!record) {
      throw new DeviceManagementError("Device not found", 404);
    }

    record.trusted = false;
    record.blocked = false;
    record.state = DEVICE_STATES.REVOKED;
    record.lastSeenAt = Date.now();
    await saveDevice(record);

    if (record.fingerprintHash) {
      await sessionHardeningService.forgetTrustedFingerprintHash(
        record.userId,
        record.fingerprintHash,
      );
    }

    emitDeviceEvent(DEVICE_MONITORING_EVENTS.DEVICE_REVOKED, {
      userId: record.userId,
      deviceId: record.id,
      message: input.reason ?? "Device revoked",
      metadata: { reason: input.reason ?? null },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    if (isApiSecurityMonitoringEnabled()) {
      void writeAuditLogSafe(
        {
          userId: input.actorUserId,
          action: DEVICE_AUDIT_ACTIONS.REVOKED,
          resource: "device",
          resourceId: record.id,
          metadata: { reason: input.reason ?? null },
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
        "device-management",
      );
    }

    return toDto(record);
  }

  /** Remove trusted status + delete from registry. */
  async removeDevice(input: DeviceActionInput): Promise<{ removed: true }> {
    const record = await getDeviceById(input.deviceId);
    if (!record) {
      throw new DeviceManagementError("Device not found", 404);
    }

    if (record.fingerprintHash) {
      await sessionHardeningService.forgetTrustedFingerprintHash(
        record.userId,
        record.fingerprintHash,
      );
    }

    await deleteDevice(input.deviceId);

    emitDeviceEvent(DEVICE_MONITORING_EVENTS.DEVICE_REMOVED, {
      userId: record.userId,
      deviceId: record.id,
      message: "Device removed",
      metadata: {},
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    if (isApiSecurityMonitoringEnabled()) {
      void writeAuditLogSafe(
        {
          userId: input.actorUserId,
          action: DEVICE_AUDIT_ACTIONS.REMOVED,
          resource: "device",
          resourceId: record.id,
          metadata: {},
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
        "device-management",
      );
    }

    return { removed: true };
  }

  /**
   * Whether the current request fingerprint maps to a blocked device.
   * Used by auth middleware when blocked-device enforcement is on.
   */
  async isBlockedFingerprint(
    userId: string,
    deviceFingerprint: string | null | undefined,
  ): Promise<boolean> {
    if (!isDeviceManagementEnabled()) return false;
    if (!getDeviceManagementPolicy().blockedDeviceEnforcement) return false;
    const hash = hashFingerprint(deviceFingerprint);
    if (!hash) return false;
    const record = await getDeviceByFingerprint(userId, hash);
    return Boolean(
      record &&
        (record.blocked || record.state === DEVICE_STATES.BLOCKED),
    );
  }

  getDashboardMetrics(devices?: ManagedDeviceDto[]): DeviceManagementDashboardMetrics {
    const list = devices ?? [];
    const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;
    return {
      registeredDevices: list.length,
      trustedDevices: list.filter((d) => d.trusted).length,
      blockedDevices: list.filter((d) => d.blocked).length,
      suspiciousDevices: list.filter(
        (d) => d.state === DEVICE_STATES.SUSPICIOUS,
      ).length,
      unknownDevices: list.filter(
        (d) => !d.fingerprintBound || d.deviceType === DEVICE_TYPES.UNKNOWN,
      ).length,
      recentDevices: list.filter(
        (d) => new Date(d.lastSeenAt).getTime() >= recentCutoff,
      ).length,
    };
  }

  async getDashboardMetricsAsync(userId?: string): Promise<DeviceManagementDashboardMetrics> {
    if (!isDeviceManagementEnabled()) {
      return {
        registeredDevices: 0,
        trustedDevices: 0,
        blockedDevices: 0,
        suspiciousDevices: 0,
        unknownDevices: 0,
        recentDevices: 0,
      };
    }
    const devices = await this.listDevices(userId ? { userId } : undefined);
    return this.getDashboardMetrics(devices);
  }

  private async evictOldestIfNeeded(userId: string): Promise<void> {
    const policy = getDeviceManagementPolicy();
    const devices = await listDevicesByUser(userId);
    const candidates = devices
      .filter(
        (d) =>
          !d.trusted &&
          d.state !== DEVICE_STATES.BLOCKED &&
          d.state !== DEVICE_STATES.REVOKED,
      )
      .sort((a, b) => a.lastSeenAt - b.lastSeenAt);

    const activeCount = devices.filter(
      (d) =>
        d.state !== DEVICE_STATES.REVOKED && d.state !== DEVICE_STATES.BLOCKED,
    ).length;

    if (activeCount < policy.maxDevicesPerUser) return;
    const victim = candidates[0];
    if (!victim) return;
    victim.state = DEVICE_STATES.REVOKED;
    await saveDevice(victim);
  }

  async cleanupInactive(): Promise<number> {
    const policy = getDeviceManagementPolicy();
    if (!policy.autoCleanupEnabled) return 0;

    const cutoff =
      Date.now() - policy.inactiveTimeoutDays * 24 * 60 * 60 * 1000;
    const all = await listAllDevices();
    let changed = 0;
    for (const record of all) {
      if (
        record.lastSeenAt < cutoff &&
        record.state !== DEVICE_STATES.BLOCKED &&
        record.state !== DEVICE_STATES.REVOKED &&
        record.state !== DEVICE_STATES.INACTIVE
      ) {
        record.state = DEVICE_STATES.INACTIVE;
        await saveDevice(record);
        changed += 1;
      }
    }
    return changed;
  }
}

export class DeviceManagementError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "DeviceManagementError";
    this.statusCode = statusCode;
  }
}

export const deviceManagementService = new DeviceManagementService();
