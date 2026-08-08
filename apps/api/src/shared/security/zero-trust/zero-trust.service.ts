import { prisma, Prisma } from "@enterprise/database";

import { writeAuditLogSafe } from "../write-audit-log.js";
import { logger } from "../logger.js";
import { mfaService } from "../../../modules/auth/mfa/index.js";
import { sessionHardeningService } from "../session-hardening/index.js";
import {
  maxRisk,
  resolvePathClassification,
  scoreToRisk,
  ZERO_TRUST_PASSWORD_MAX_AGE_DAYS,
  ZERO_TRUST_RISK_POLICIES,
  ZERO_TRUST_STEP_UP_EXEMPT_PATHS,
} from "./zero-trust.policies.js";
import {
  getStepUpStatus,
  hasValidStepUp,
  markStepUpVerified,
} from "./zero-trust.step-up.js";
import {
  ZERO_TRUST_ERROR_CODES,
  type RequestTrustResult,
  type ResourceTrustResult,
  type SessionTrustResult,
  type ZeroTrustDecision,
  type ZeroTrustRiskLevel,
  type ZeroTrustSignal,
  type ZeroTrustStatusDto,
} from "./zero-trust.types.js";
import type { DataClassification } from "@enterprise/shared";
import {
  CLASSIFICATION_TRUST_REQUIREMENTS,
  UserRole,
} from "@enterprise/shared";

const AUDIT_RESOURCE = "zero_trust";

export interface ZeroTrustActor {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
}

export interface ZeroTrustRequestContext {
  path: string;
  method: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  /** Optional device fingerprint from client header */
  deviceFingerprint?: string | null;
  /** Optional geo for impossible-travel style signal */
  location?: { lat?: number | null; lon?: number | null; country?: string | null } | null;
  classification?: DataClassification;
  /**
   * Optional session/user snapshot from authenticate() — avoids re-querying
   * the same rows that SessionService already loaded.
   */
  preloaded?: {
    session: {
      id: string;
      userId: string;
      ipAddress: string | null;
      userAgent: string | null;
      deviceName?: string | null;
      revokedAt: Date | null;
      createdAt: Date;
      lastActiveAt: Date;
    };
    user: {
      id: string;
      status: string;
      passwordChangedAt: Date | null;
      twoFactorEnabled: boolean;
      lockedUntil: Date | null;
    };
  };
}

function fingerprintFromUa(userAgent?: string | null): string | null {
  if (!userAgent) return null;
  return userAgent.slice(0, 256);
}

class ZeroTrustService {
  evaluateResourceTrust(
    classification: DataClassification,
  ): ResourceTrustResult {
    const req = CLASSIFICATION_TRUST_REQUIREMENTS[classification];
    const signals: ZeroTrustSignal[] = [
      {
        key: "classification",
        label: "Resource classification",
        contribution: req.elevated ? 25 : 5,
        detail: classification,
      },
    ];

    let riskLevel: ZeroTrustRiskLevel = "LOW";
    if (classification === "RESTRICTED") riskLevel = "HIGH";
    else if (classification === "CONFIDENTIAL") riskLevel = "MEDIUM";
    else if (classification === "INTERNAL") riskLevel = "LOW";

    return {
      classification,
      riskLevel,
      requiresElevatedTrust: req.elevated,
      signals,
    };
  }

  async evaluateSessionTrust(
    actor: ZeroTrustActor,
    context: ZeroTrustRequestContext,
  ): Promise<SessionTrustResult> {
    const signals: ZeroTrustSignal[] = [];
    const reasons: string[] = [];
    let score = 0;

    const [session, user, activeRefresh] = await Promise.all([
      context.preloaded?.session
        ? Promise.resolve(context.preloaded.session)
        : prisma.session.findUnique({
            where: { id: actor.sessionId },
            select: {
              id: true,
              userId: true,
              ipAddress: true,
              userAgent: true,
              deviceName: true,
              revokedAt: true,
              createdAt: true,
              lastActiveAt: true,
            },
          }),
      context.preloaded?.user
        ? Promise.resolve(context.preloaded.user)
        : prisma.user.findUnique({
            where: { id: actor.userId },
            select: {
              id: true,
              status: true,
              passwordChangedAt: true,
              twoFactorEnabled: true,
              lockedUntil: true,
            },
          }),
      prisma.refreshToken.findFirst({
        where: { sessionId: actor.sessionId, revokedAt: null },
        select: { id: true },
      }),
    ]);

    // Authenticated user present
    signals.push({
      key: "authenticated_user",
      label: "Authenticated user",
      contribution: 0,
      detail: actor.userId,
    });

    if (!session || session.userId !== actor.userId) {
      score += 100;
      reasons.push("Session not found or mismatched");
      signals.push({
        key: "session_validity",
        label: "Session validity",
        contribution: 100,
        detail: "missing",
      });
    } else if (session.revokedAt) {
      score += 100;
      reasons.push("Session revoked");
      signals.push({
        key: "session_validity",
        label: "Session revoked",
        contribution: 100,
      });
    } else {
      signals.push({
        key: "session_validity",
        label: "Session valid",
        contribution: 0,
      });
    }

    if (!user) {
      score += 100;
      reasons.push("Account not found");
    } else {
      if (user.status === "DEACTIVATED") {
        score += 100;
        reasons.push("Account deactivated");
        signals.push({
          key: "account_status",
          label: "Account status",
          contribution: 100,
          detail: user.status,
        });
      } else if (user.status === "LOCKED") {
        score += 90;
        reasons.push("Account locked");
        signals.push({
          key: "account_status",
          label: "Account status",
          contribution: 90,
          detail: user.status,
        });
      } else if (user.status !== "ACTIVE") {
        score += 40;
        reasons.push(`Account status ${user.status}`);
        signals.push({
          key: "account_status",
          label: "Account status",
          contribution: 40,
          detail: user.status,
        });
      } else {
        signals.push({
          key: "account_status",
          label: "Account active",
          contribution: 0,
          detail: user.status,
        });
      }

      if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
        score += 90;
        reasons.push("Account locked");
        signals.push({
          key: "account_locked",
          label: "Account locked",
          contribution: 90,
        });
      }

      // MFA state
      if (user.twoFactorEnabled) {
        signals.push({
          key: "mfa_state",
          label: "MFA enabled",
          contribution: -5,
        });
        score = Math.max(0, score - 5);
      } else {
        score += 15;
        signals.push({
          key: "mfa_state",
          label: "MFA not enabled",
          contribution: 15,
        });
      }

      // Password age
      if (user.passwordChangedAt) {
        const ageDays =
          (Date.now() - user.passwordChangedAt.getTime()) /
          (24 * 60 * 60 * 1000);
        if (ageDays > ZERO_TRUST_PASSWORD_MAX_AGE_DAYS) {
          score += 20;
          reasons.push("Password aged");
          signals.push({
            key: "password_age",
            label: "Password age",
            contribution: 20,
            detail: `${Math.floor(ageDays)}d`,
          });
        } else {
          signals.push({
            key: "password_age",
            label: "Password fresh",
            contribution: 0,
          });
        }

        // Password changed after session issued
        if (session && user.passwordChangedAt > session.createdAt) {
          score += 85;
          reasons.push("Password changed after session start");
          signals.push({
            key: "password_changed",
            label: "Password changed during session",
            contribution: 85,
          });
        }
      }

      // Refresh token revoked for session (fetched in parallel above)
      if (session) {
        if (!activeRefresh) {
          score += 95;
          reasons.push("Refresh token revoked");
          signals.push({
            key: "refresh_token",
            label: "Refresh token revoked",
            contribution: 95,
          });
        }
      }
    }

    // IP change
    if (session && context.ipAddress && session.ipAddress) {
      if (context.ipAddress !== session.ipAddress) {
        score += 35;
        reasons.push("IP change detected");
        signals.push({
          key: "ip_change",
          label: "IP change",
          contribution: 35,
          detail: "request_ip_differs_from_session",
        });
      } else {
        signals.push({
          key: "ip_change",
          label: "IP matches session",
          contribution: 0,
        });
      }
    }

    // Device fingerprint / known device
    const requestFp =
      context.deviceFingerprint ?? fingerprintFromUa(context.userAgent);
    const sessionFp = fingerprintFromUa(session?.userAgent ?? null);
    if (requestFp && sessionFp) {
      if (requestFp !== sessionFp) {
        score += 30;
        reasons.push("Device fingerprint mismatch");
        signals.push({
          key: "device_fingerprint",
          label: "Unknown device fingerprint",
          contribution: 30,
        });
        signals.push({
          key: "known_device",
          label: "Known device",
          contribution: 30,
          detail: "false",
        });
      } else {
        signals.push({
          key: "device_fingerprint",
          label: "Device fingerprint match",
          contribution: 0,
        });
        signals.push({
          key: "known_device",
          label: "Known device",
          contribution: -5,
          detail: "true",
        });
        score = Math.max(0, score - 5);
      }
    }

    // Role / permission presence (signal only — RBAC still separate)
    signals.push({
      key: "role",
      label: "Role",
      contribution: 0,
      detail: actor.role,
    });
    signals.push({
      key: "permission",
      label: "Permissions loaded",
      contribution: actor.permissions.length > 0 ? 0 : 10,
      detail: String(actor.permissions.length),
    });
    if (actor.permissions.length === 0) {
      score += 10;
    }

    // Impossible travel — only when location present (reuse monitoring concept)
    if (
      context.location?.lat != null &&
      context.location?.lon != null &&
      Number.isFinite(context.location.lat) &&
      Number.isFinite(context.location.lon)
    ) {
      // Soft signal: geo present without prior pair → low contribution;
      // elevated risk when prior CRITICAL travel event exists recently.
      const recentTravel = await prisma.securityEvent.findFirst({
        where: {
          userId: actor.userId,
          eventType: "impossible_travel",
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
        select: { id: true },
      });
      if (recentTravel) {
        score += 50;
        reasons.push("Recent impossible travel signal");
        signals.push({
          key: "impossible_travel",
          label: "Impossible travel (monitoring)",
          contribution: 50,
        });
      } else {
        signals.push({
          key: "impossible_travel",
          label: "Location present — no travel anomaly",
          contribution: 0,
        });
      }
    }

    const riskLevel = scoreToRisk(score);
    return {
      trusted: riskLevel !== "CRITICAL",
      riskLevel,
      score: Math.min(100, score),
      signals,
      reasons,
    };
  }

  async evaluateRequestTrust(
    actor: ZeroTrustActor,
    context: ZeroTrustRequestContext,
  ): Promise<RequestTrustResult> {
    const classification =
      context.classification ?? resolvePathClassification(context.path);
    const resource = this.evaluateResourceTrust(classification);

    const [session, trustedDevice] = await Promise.all([
      this.evaluateSessionTrust(actor, context),
      sessionHardeningService.shouldReduceMfaPrompt(
        actor.userId,
        context.deviceFingerprint,
      ),
    ]);

    let combinedScore = session.score + (resource.requiresElevatedTrust ? 15 : 0);
    if (classification === "RESTRICTED") {
      combinedScore += 20;
    }

    let riskLevel = maxRisk(session.riskLevel, resource.riskLevel);
    riskLevel = maxRisk(riskLevel, scoreToRisk(combinedScore));

    const stepUp = hasValidStepUp(actor.sessionId);
    const exempt = ZERO_TRUST_STEP_UP_EXEMPT_PATHS.some(
      (p) => context.path === p || context.path.endsWith(p),
    );

    let decision: ZeroTrustDecision;
    let requiresStepUp = false;
    let reason: string;

    if (riskLevel === "CRITICAL") {
      decision = "BLOCK";
      reason =
        session.reasons[0] ??
        "Critical trust failure — request blocked";
    } else if (riskLevel === "HIGH") {
      if (stepUp || trustedDevice || exempt) {
        decision = "ALLOW_AUDIT";
        reason = stepUp
          ? "High risk accepted after step-up MFA"
          : trustedDevice
            ? "High risk accepted on trusted device (auth still required)"
            : "High risk on exempt path — audited";
      } else {
        // Reuse session-trust MFA flag when available — avoid another user round-trip.
        const mfaEnabled =
          context.preloaded?.user.twoFactorEnabled ??
          (
            await prisma.user.findUnique({
              where: { id: actor.userId },
              select: { twoFactorEnabled: true },
            })
          )?.twoFactorEnabled;
        if (mfaEnabled) {
          decision = "REQUIRE_STEP_UP";
          requiresStepUp = true;
          reason = "High risk — step-up MFA required";
        } else if (classification === "RESTRICTED") {
          decision = "BLOCK";
          reason =
            "High risk on RESTRICTED resource without MFA — request blocked";
        } else {
          decision = "ALLOW_AUDIT";
          reason =
            "High risk without MFA enrolled — allowed with elevated audit";
        }
      }
    } else if (riskLevel === "MEDIUM") {
      decision = "ALLOW_AUDIT";
      reason = "Medium risk — allow with audit";
    } else {
      decision = "ALLOW";
      reason = "Low risk — allow";
    }

    const signals = [...session.signals, ...resource.signals];

    return {
      riskLevel,
      decision,
      score: Math.min(100, combinedScore),
      requiresStepUp,
      reason,
      signals,
      session,
      resource,
      evaluatedAt: new Date().toISOString(),
    };
  }

  async auditEvaluation(
    actor: ZeroTrustActor,
    result: RequestTrustResult,
    context: ZeroTrustRequestContext,
  ): Promise<void> {
    const action =
      result.decision === "BLOCK"
        ? result.riskLevel === "CRITICAL"
          ? "zero_trust.critical_block"
          : "zero_trust.trust_denied"
        : result.requiresStepUp
          ? "zero_trust.step_up_required"
          : "zero_trust.policy_evaluation";

    await writeAuditLogSafe(
      {
        userId: actor.userId,
        action,
        resource: AUDIT_RESOURCE,
        resourceId: actor.sessionId,
        metadata: {
          decision: result.decision,
          riskLevel: result.riskLevel,
          score: result.score,
          requiresStepUp: result.requiresStepUp,
          reason: result.reason,
          classification: result.resource.classification,
          path: context.path,
          method: context.method,
        },
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
      "zero-trust",
    );
  }

  async completeStepUp(input: {
    actor: ZeroTrustActor;
    code: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ verified: boolean; expiresAt: string }> {
    const user = await prisma.user.findUnique({
      where: { id: input.actor.userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
        recoveryCodes: true,
        twoFactorLastStep: true,
      },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      throw Object.assign(new Error("MFA_NOT_ENABLED"), { code: "MFA_NOT_ENABLED" });
    }

    // Reuse existing MFA implementation — do not create a second MFA system.
    const factor = await mfaService.verifyLoginFactor({
      encryptedSecret: user.twoFactorSecret,
      recoveryCodes: mfaService.parseRecoveryCodes(user.recoveryCodes),
      lastStep: user.twoFactorLastStep ?? null,
      code: input.code,
    });

    if (!factor.ok) {
      await writeAuditLogSafe(
        {
          userId: input.actor.userId,
          action: "zero_trust.step_up_failed",
          resource: AUDIT_RESOURCE,
          resourceId: input.actor.sessionId,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
        "zero-trust",
      );
      throw Object.assign(new Error("MFA_INVALID"), { code: "MFA_INVALID" });
    }

    if (factor.method === "totp") {
      await prisma.user.update({
        where: { id: input.actor.userId },
        data: { twoFactorLastStep: factor.step },
      });
    } else {
      await prisma.user.update({
        where: { id: input.actor.userId },
        data: {
          recoveryCodes:
            factor.updatedRecoveryCodes as unknown as Prisma.InputJsonValue,
        },
      });
    }

    markStepUpVerified(input.actor.sessionId);
    const status = getStepUpStatus(input.actor.sessionId);

    await writeAuditLogSafe(
      {
        userId: input.actor.userId,
        action: "zero_trust.step_up_verified",
        resource: AUDIT_RESOURCE,
        resourceId: input.actor.sessionId,
        metadata: { method: factor.method },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
      "zero-trust",
    );

    return {
      verified: true,
      expiresAt: status.expiresAt ?? new Date().toISOString(),
    };
  }

  getPolicies() {
    return [...ZERO_TRUST_RISK_POLICIES];
  }

  async getStatus(
    actor: ZeroTrustActor,
    context: ZeroTrustRequestContext,
    options: { enabled: boolean; enforcement: boolean },
  ): Promise<ZeroTrustStatusDto> {
    let lastEvaluation: RequestTrustResult | null = null;
    try {
      lastEvaluation = await this.evaluateRequestTrust(actor, context);
    } catch (error) {
      logger.error("[zero-trust] status evaluation failed:", error);
    }

    const stepUp = getStepUpStatus(actor.sessionId);
    return {
      enabled: options.enabled,
      enforcement: options.enforcement,
      lastEvaluation,
      stepUpActive: stepUp.active,
      stepUpExpiresAt: stepUp.expiresAt,
      policies: this.getPolicies(),
    };
  }

  isPrivilegedRole(role: string): boolean {
    return (
      role === UserRole.ADMIN ||
      role === UserRole.SUPER_ADMIN ||
      role === "ADMIN" ||
      role === "SUPER_ADMIN"
    );
  }
}

export const zeroTrustService = new ZeroTrustService();
export { ZERO_TRUST_ERROR_CODES };
