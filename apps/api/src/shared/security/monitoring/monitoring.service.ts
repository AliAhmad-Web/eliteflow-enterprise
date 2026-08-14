import type {
  SecurityIncident,
  SecuritySeverity,
} from "@enterprise/database";
import { prisma, Prisma } from "@enterprise/database";

import { writeAuditLogSafe } from "../write-audit-log.js";
import { logger } from "../logger.js";
import { getThreatRule } from "./monitoring.rules.js";
import {
  THREAT_DETECTION_TYPES,
  type ReportThreatInput,
  type ThreatDetectionType,
  type ThreatReportResult,
} from "./monitoring.types.js";

const MONITORING_AUDIT_RESOURCE = "security_monitoring";

const HIGH_SEVERITIES: SecuritySeverity[] = ["HIGH", "CRITICAL"];

function buildCorrelationKey(input: {
  type: ThreatDetectionType;
  userId?: string | null;
  ipAddress?: string | null;
  resource?: string | null;
}): string {
  const actor = input.userId ?? input.ipAddress ?? "anonymous";
  const resource = input.resource ?? "*";
  return `${input.type}:${actor}:${resource}`.slice(0, 255);
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

class SecurityMonitoringService {
  /**
   * Central entry — all modules should report threats through this method.
   * Never throws into the request pipeline.
   */
  async report(input: ReportThreatInput): Promise<ThreatReportResult> {
    const empty: ThreatReportResult = {
      eventId: null,
      incidentId: null,
      incidentCreated: false,
      incidentUpdated: false,
      countInWindow: 0,
      severity: "INFO",
    };

    // Cap wait so hung poolers cannot steal connections from OAuth/login.
    const budgetMs = Number(
      process.env.SECURITY_MONITORING_REPORT_BUDGET_MS ?? 2_500,
    );

    try {
      return await Promise.race([
        this.reportInternal(input),
        new Promise<ThreatReportResult>((resolve) => {
          setTimeout(() => resolve(empty), Number.isFinite(budgetMs) ? budgetMs : 2_500);
        }),
      ]);
    } catch (error) {
      logger.error("[security-monitoring] Failed to report threat:", error);
      return empty;
    }
  }

  /** Convenience wrappers used by call sites */
  reportFailedLogin(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.REPEATED_FAILED_LOGIN });
  }

  reportMfaFailure(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.REPEATED_MFA_FAILURE });
  }

  reportPrivilegeEscalation(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.PRIVILEGE_ESCALATION });
  }

  reportRbacDenial(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.RBAC_DENIAL_SPIKE });
  }

  reportAclDenial(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.ACL_DENIAL_SPIKE });
  }

  reportAiPolicyDenial(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.AI_POLICY_DENIAL_SPIKE });
  }

  reportAuditChainCorruption(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.AUDIT_CHAIN_CORRUPTION,
    });
  }

  reportMalware(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.UPLOAD_MALWARE });
  }

  reportUploadValidationFailure(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.UPLOAD_VALIDATION_FAILURES,
    });
  }

  reportRateLimitAbuse(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.RATE_LIMIT_ABUSE });
  }

  reportRateLimitExceeded(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.RATE_LIMIT_EXCEEDED,
    });
  }

  reportRateLimitBypassed(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.RATE_LIMIT_BYPASSED,
    });
  }

  reportRedisUnavailable(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.REDIS_UNAVAILABLE,
    });
  }

  reportCsrfInvalid(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.CSRF_INVALID });
  }

  reportCsrfExpired(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.CSRF_EXPIRED });
  }

  reportCsrfMissing(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.CSRF_MISSING });
  }

  reportCsrfReplay(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.CSRF_REPLAY });
  }

  reportCsrfSessionMismatch(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.CSRF_SESSION_MISMATCH,
    });
  }

  reportSessionAnomaly(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.SESSION_ANOMALY });
  }

  reportSessionDeviceChanged(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.SESSION_DEVICE_CHANGED,
    });
  }

  reportSessionIpChanged(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.SESSION_IP_CHANGED,
    });
  }

  reportSessionRiskHigh(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.SESSION_RISK_HIGH,
    });
  }

  reportSessionRotated(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.SESSION_ROTATED,
    });
  }

  reportSessionLimitExceeded(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.SESSION_LIMIT_EXCEEDED,
    });
  }

  reportTrustedDeviceUsed(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.TRUSTED_DEVICE_USED,
    });
  }

  /** Device Management monitoring events — never throws to callers. */
  reportDeviceEvent(
    input: ReportThreatInput & {
      type:
        | typeof THREAT_DETECTION_TYPES.DEVICE_REGISTERED
        | typeof THREAT_DETECTION_TYPES.DEVICE_TRUSTED
        | typeof THREAT_DETECTION_TYPES.DEVICE_REMOVED
        | typeof THREAT_DETECTION_TYPES.DEVICE_BLOCKED
        | typeof THREAT_DETECTION_TYPES.DEVICE_REVOKED
        | typeof THREAT_DETECTION_TYPES.DEVICE_SUSPICIOUS
        | typeof THREAT_DETECTION_TYPES.UNKNOWN_DEVICE
        | typeof THREAT_DETECTION_TYPES.DEVICE_LIMIT_EXCEEDED
        | typeof THREAT_DETECTION_TYPES.DEVICE_POLICY_VIOLATION;
    },
  ) {
    return this.report(input);
  }

  /** Tenant Isolation assessment events — never throws to callers. */
  reportTenantIsolationEvent(
    input: ReportThreatInput & {
      type:
        | typeof THREAT_DETECTION_TYPES.TENANT_ISOLATION_STARTED
        | typeof THREAT_DETECTION_TYPES.TENANT_ISOLATION_COMPLETED
        | typeof THREAT_DETECTION_TYPES.TENANT_CONTEXT_MISSING
        | typeof THREAT_DETECTION_TYPES.CROSS_TENANT_ACCESS
        | typeof THREAT_DETECTION_TYPES.CACHE_ISOLATION_FAILED
        | typeof THREAT_DETECTION_TYPES.SESSION_ISOLATION_FAILED
        | typeof THREAT_DETECTION_TYPES.AI_ISOLATION_FAILED
        | typeof THREAT_DETECTION_TYPES.FILE_ISOLATION_FAILED;
    },
  ) {
    return this.report(input);
  }

  /** Security Regression assessment events — never throws to callers. */
  reportSecurityRegressionEvent(
    input: ReportThreatInput & {
      type:
        | typeof THREAT_DETECTION_TYPES.SECURITY_REGRESSION_STARTED
        | typeof THREAT_DETECTION_TYPES.SECURITY_REGRESSION_COMPLETED
        | typeof THREAT_DETECTION_TYPES.SECURITY_REGRESSION_FAILED
        | typeof THREAT_DETECTION_TYPES.SECURITY_CONTROL_FAILED
        | typeof THREAT_DETECTION_TYPES.DEPLOYMENT_NOT_READY;
    },
  ) {
    return this.report(input);
  }

  /** API Versioning events — never throws to callers. */
  reportApiVersionEvent(
    input: ReportThreatInput & {
      type:
        | typeof THREAT_DETECTION_TYPES.API_VERSION_USED
        | typeof THREAT_DETECTION_TYPES.DEPRECATED_API_VERSION
        | typeof THREAT_DETECTION_TYPES.UNSUPPORTED_API_VERSION
        | typeof THREAT_DETECTION_TYPES.API_VERSION_FALLBACK
        | typeof THREAT_DETECTION_TYPES.API_VERSION_COMPATIBILITY;
    },
  ) {
    return this.report(input);
  }

  /** Signed Webhook Security events — never throws to callers. */
  reportWebhookSecurityEvent(
    input: ReportThreatInput & {
      type:
        | typeof THREAT_DETECTION_TYPES.WEBHOOK_CREATED
        | typeof THREAT_DETECTION_TYPES.WEBHOOK_SIGNED
        | typeof THREAT_DETECTION_TYPES.WEBHOOK_DELIVERED
        | typeof THREAT_DETECTION_TYPES.WEBHOOK_FAILED
        | typeof THREAT_DETECTION_TYPES.WEBHOOK_RETRY
        | typeof THREAT_DETECTION_TYPES.WEBHOOK_SIGNATURE_INVALID
        | typeof THREAT_DETECTION_TYPES.WEBHOOK_REPLAY_ATTACK
        | typeof THREAT_DETECTION_TYPES.WEBHOOK_SECRET_ROTATED
        | typeof THREAT_DETECTION_TYPES.WEBHOOK_DEAD_LETTER;
    },
  ) {
    return this.report(input);
  }

  reportPromptInjectionAttempt(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.PROMPT_INJECTION_ATTEMPT,
    });
  }

  reportSystemPromptAttack(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.SYSTEM_PROMPT_ATTACK,
    });
  }

  reportSecretExtractionAttempt(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.SECRET_EXTRACTION_ATTEMPT,
    });
  }

  reportMemoryPoisoning(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.MEMORY_POISONING,
    });
  }

  reportDocumentInjection(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.DOCUMENT_INJECTION,
    });
  }

  reportToolInjection(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.TOOL_INJECTION,
    });
  }

  reportOutputSecretLeak(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.OUTPUT_SECRET_LEAK,
    });
  }

  reportConfirmationCreated(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.CONFIRMATION_CREATED,
    });
  }

  reportConfirmationApproved(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.CONFIRMATION_APPROVED,
    });
  }

  reportConfirmationRejected(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.CONFIRMATION_REJECTED,
    });
  }

  reportConfirmationExpired(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.CONFIRMATION_EXPIRED,
    });
  }

  reportConfirmationReplay(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.CONFIRMATION_REPLAY,
    });
  }

  reportConfirmationArgumentChanged(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.CONFIRMATION_ARGUMENT_CHANGED,
    });
  }

  reportMassDelete(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.MASS_DELETE });
  }

  reportMassExport(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.MASS_EXPORT });
  }

  reportApiError(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.EXCESSIVE_API_ERRORS });
  }

  reportSodViolation(input: Omit<ReportThreatInput, "type">) {
    return this.report({ ...input, type: THREAT_DETECTION_TYPES.SOD_VIOLATION_SPIKE });
  }

  reportSecurityHeadersDisabled(input: Omit<ReportThreatInput, "type">) {
    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.SECURITY_HEADERS_DISABLED,
    });
  }

  /**
   * Impossible travel only when geo coordinates exist on current + prior login.
   */
  async reportImpossibleTravelIfApplicable(
    input: Omit<ReportThreatInput, "type"> & {
      location?: ReportThreatInput["location"];
    },
  ): Promise<ThreatReportResult | null> {
    const loc = input.location;
    if (
      loc?.lat == null ||
      loc?.lon == null ||
      !Number.isFinite(loc.lat) ||
      !Number.isFinite(loc.lon)
    ) {
      return null;
    }

    if (!input.userId) {
      return null;
    }

    const prior = await prisma.securityEvent.findFirst({
      where: {
        userId: input.userId,
        eventType: { in: ["failed_login", "session_anomaly", "impossible_travel"] },
        metadata: { path: ["location", "lat"], not: Prisma.DbNull },
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    const priorMeta =
      prior?.metadata && typeof prior.metadata === "object" && !Array.isArray(prior.metadata)
        ? (prior.metadata as Record<string, unknown>)
        : null;
    const priorLoc =
      priorMeta?.location && typeof priorMeta.location === "object"
        ? (priorMeta.location as { lat?: number; lon?: number; at?: string })
        : null;

    if (
      priorLoc?.lat == null ||
      priorLoc?.lon == null ||
      !Number.isFinite(priorLoc.lat) ||
      !Number.isFinite(priorLoc.lon)
    ) {
      // Store current location context via a low-severity session signal only if we later have a pair.
      return null;
    }

    const priorAt = prior?.createdAt?.getTime() ?? Date.now();
    const hours = Math.max((Date.now() - priorAt) / 3_600_000, 0.01);
    const distanceKm = haversineKm(priorLoc.lat, priorLoc.lon, loc.lat, loc.lon);
    const speedKmh = distanceKm / hours;

    // >800 km/h is physically implausible for commercial travel.
    if (speedKmh < 800) {
      return null;
    }

    return this.report({
      ...input,
      type: THREAT_DETECTION_TYPES.IMPOSSIBLE_TRAVEL,
      message:
        input.message ??
        "Impossible travel detected from successive authenticated locations",
      metadata: {
        ...(input.metadata ?? {}),
        location: loc,
        priorLocation: priorLoc,
        distanceKm: Math.round(distanceKm),
        speedKmh: Math.round(speedKmh),
      },
    });
  }

  async resolveIncident(
    incidentId: string,
    resolvedById: string,
  ): Promise<SecurityIncident | null> {
    const existing = await prisma.securityIncident.findUnique({
      where: { id: incidentId },
    });
    if (!existing || existing.status === "RESOLVED") {
      return existing;
    }

    const updated = await prisma.securityIncident.update({
      where: { id: incidentId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedById,
      },
    });

    await writeAuditLogSafe(
      {
        userId: resolvedById,
        action: "security_monitoring.incident_resolved",
        resource: MONITORING_AUDIT_RESOURCE,
        resourceId: incidentId,
        metadata: {
          type: updated.type,
          severity: updated.severity,
          count: updated.count,
        },
      },
      "security-monitoring",
    );

    return updated;
  }

  async getThreatDashboardMetrics(since = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    const [
      openIncidents,
      criticalAlerts,
      eventsLast24h,
      severityGroups,
      topTypes,
      topModules,
    ] = await Promise.all([
      prisma.securityIncident.count({
        where: { status: { in: ["OPEN", "INVESTIGATING"] } },
      }),
      prisma.securityIncident.count({
        where: {
          status: { in: ["OPEN", "INVESTIGATING"] },
          severity: "CRITICAL",
        },
      }),
      prisma.securityEvent.count({ where: { createdAt: { gte: since } } }),
      prisma.securityEvent.groupBy({
        by: ["severity"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.securityIncident.groupBy({
        by: ["type"],
        where: { lastSeenAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { type: "desc" } },
        take: 8,
      }),
      prisma.securityEvent.findMany({
        where: { createdAt: { gte: since } },
        select: { metadata: true, category: true },
        take: 2000,
      }),
    ]);

    const severityDistribution: Record<string, number> = {
      INFO: 0,
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    for (const row of severityGroups) {
      severityDistribution[row.severity] = row._count._all;
    }

    const moduleCounts = new Map<string, number>();
    for (const event of topModules) {
      const meta =
        event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
          ? (event.metadata as Record<string, unknown>)
          : {};
      const moduleName =
        typeof meta.module === "string"
          ? meta.module
          : event.category.toLowerCase();
      moduleCounts.set(moduleName, (moduleCounts.get(moduleName) ?? 0) + 1);
    }

    const topAffectedModules = [...moduleCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([module, count]) => ({ module, count }));

    return {
      openIncidents,
      criticalAlerts,
      topAttackTypes: topTypes.map((row) => ({
        type: row.type,
        count: row._count._all,
      })),
      topAffectedModules,
      eventsLast24Hours: eventsLast24h,
      severityDistribution,
    };
  }

  private async reportInternal(
    input: ReportThreatInput,
  ): Promise<ThreatReportResult> {
    const rule = getThreatRule(input.type);
    const since = new Date(Date.now() - rule.windowMs);

    const actorFilter: Prisma.SecurityEventWhereInput =
      input.userId && input.ipAddress
        ? { OR: [{ userId: input.userId }, { ipAddress: input.ipAddress }] }
        : input.userId
          ? { userId: input.userId }
          : input.ipAddress
            ? { ipAddress: input.ipAddress }
            : {};

    const countInWindow =
      (await prisma.securityEvent.count({
        where: {
          eventType: rule.eventType,
          createdAt: { gte: since },
          ...actorFilter,
        },
      })) + 1;

    const breached =
      rule.immediateIncident === true || countInWindow >= rule.threshold;
    const severity: SecuritySeverity = breached
      ? rule.incidentSeverity
      : rule.baseSeverity;

    const message =
      input.message ??
      `${rule.type.replace(/_/g, " ").toLowerCase()} detected`;

    const metadata = {
      module: rule.module,
      detectionType: rule.type,
      countInWindow,
      threshold: rule.threshold,
      windowMs: rule.windowMs,
      resource: input.resource ?? null,
      ...(input.location ? { location: input.location } : {}),
      ...(input.metadata ?? {}),
    };

    const event = await prisma.securityEvent.create({
      data: {
        userId: input.userId ?? null,
        severity,
        category: rule.category,
        eventType: rule.eventType,
        message: message.slice(0, 500),
        metadata: metadata as Prisma.InputJsonValue,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });

    await writeAuditLogSafe(
      {
        userId: input.userId ?? null,
        action: "security_monitoring.rule_triggered",
        resource: MONITORING_AUDIT_RESOURCE,
        resourceId: event.id,
        metadata: {
          detectionType: rule.type,
          severity,
          countInWindow,
          breached,
        },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
      "security-monitoring",
    );

    let incidentId: string | null = null;
    let incidentCreated = false;
    let incidentUpdated = false;

    if (breached && HIGH_SEVERITIES.includes(rule.incidentSeverity)) {
      const correlationKey = buildCorrelationKey({
        type: rule.type,
        userId: input.userId,
        ipAddress: input.ipAddress,
        resource: input.resource,
      });

      const open = await prisma.securityIncident.findFirst({
        where: {
          correlationKey,
          status: { in: ["OPEN", "INVESTIGATING"] },
          windowStartedAt: { gte: since },
        },
        orderBy: { lastSeenAt: "desc" },
      });

      const now = new Date();
      if (open) {
        const updated = await prisma.securityIncident.update({
          where: { id: open.id },
          data: {
            count: { increment: 1 },
            lastSeenAt: now,
            severity:
              rule.incidentSeverity === "CRITICAL" || open.severity === "CRITICAL"
                ? "CRITICAL"
                : rule.incidentSeverity,
            message: message.slice(0, 500),
            metadata: metadata as Prisma.InputJsonValue,
          },
        });
        incidentId = updated.id;
        incidentUpdated = true;
      } else {
        const created = await prisma.securityIncident.create({
          data: {
            type: rule.type,
            severity: rule.incidentSeverity,
            status: "OPEN",
            actorUserId: input.userId ?? null,
            resource: input.resource ?? rule.module,
            resourceId: input.resourceId ?? null,
            count: countInWindow,
            correlationKey,
            message: message.slice(0, 500),
            metadata: metadata as Prisma.InputJsonValue,
            windowStartedAt: now,
            lastSeenAt: now,
          },
        });
        incidentId = created.id;
        incidentCreated = true;

        await writeAuditLogSafe(
          {
            userId: input.userId ?? null,
            action: "security_monitoring.incident_created",
            resource: MONITORING_AUDIT_RESOURCE,
            resourceId: created.id,
            metadata: {
              type: rule.type,
              severity: rule.incidentSeverity,
              count: countInWindow,
            },
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
          },
          "security-monitoring",
        );
      }

      if (incidentId) {
        await prisma.securityEvent.update({
          where: { id: event.id },
          data: { incidentId },
        });
      }
    }

    return {
      eventId: event.id,
      incidentId,
      incidentCreated,
      incidentUpdated,
      countInWindow,
      severity,
    };
  }
}

export const securityMonitoringService = new SecurityMonitoringService();
