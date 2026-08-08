/**
 * Normalize monitoring / audit inputs into canonical SiemEvent shape.
 */

import { randomUUID } from "node:crypto";

import { getSiemConfig } from "./siem.config.js";
import { redactSiemMetadata } from "./siem.redaction.js";
import type { SiemEvent, SiemSeverity } from "./siem.types.js";

function asSeverity(value: unknown): SiemSeverity {
  const raw = typeof value === "string" ? value.toUpperCase() : "";
  switch (raw) {
    case "INFO":
    case "LOW":
    case "MEDIUM":
    case "HIGH":
    case "CRITICAL":
      return raw;
    default:
      return "INFO";
  }
}

function pickString(
  meta: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const v = meta[key];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return null;
}

function pickNumber(
  meta: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const v = meta[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

export interface NormalizeMonitoringInput {
  type: string;
  userId?: string | null;
  resource?: string | null;
  resourceId?: string | null;
  message?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  severity?: string | null;
  category?: string | null;
  eventType?: string | null;
  incidentId?: string | null;
  correlationId?: string | null;
}

export interface NormalizeAuditInput {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function normalizeMonitoringEvent(
  input: NormalizeMonitoringInput,
): SiemEvent {
  const meta = redactSiemMetadata(input.metadata ?? {});
  const tenantId = getSiemConfig().tenantId;
  const eventId = randomUUID();

  return {
    eventId,
    timestamp: new Date().toISOString(),
    tenantId,
    userId: input.userId ?? null,
    sessionId: pickString(meta, "sessionId", "session_id"),
    severity: asSeverity(input.severity ?? meta.severity),
    category: input.category ?? pickString(meta, "category") ?? "SECURITY",
    eventType:
      input.eventType ??
      pickString(meta, "eventType", "detectionType") ??
      input.type,
    resource: input.resource ?? pickString(meta, "resource") ?? null,
    action: pickString(meta, "action") ?? input.type,
    result: pickString(meta, "result", "outcome", "status"),
    ipAddress: input.ipAddress ?? null,
    deviceId: pickString(meta, "deviceId", "device_id", "trustedDeviceId"),
    correlationId:
      input.correlationId ??
      pickString(meta, "correlationId", "correlationKey") ??
      eventId,
    riskScore: pickNumber(meta, "riskScore", "score", "zeroTrustScore"),
    zeroTrustRisk: pickString(
      meta,
      "zeroTrustRisk",
      "riskLevel",
      "zeroTrustDecision",
    ),
    incidentId:
      input.incidentId ?? pickString(meta, "incidentId", "incident_id"),
    complianceFramework: pickString(
      meta,
      "complianceFramework",
      "framework",
    ),
    metadata: {
      ...meta,
      source: "security_monitoring",
      detectionType: input.type,
      resourceId: input.resourceId ?? null,
      message: input.message ?? null,
      userAgent: input.userAgent ?? null,
    },
  };
}

export function normalizeAuditEvent(input: NormalizeAuditInput): SiemEvent {
  const meta = redactSiemMetadata(
    (input.metadata as Record<string, unknown>) ?? {},
  );
  const tenantId = getSiemConfig().tenantId;
  const eventId = randomUUID();

  return {
    eventId,
    timestamp: new Date().toISOString(),
    tenantId,
    userId: input.userId ?? null,
    sessionId: pickString(meta, "sessionId", "session_id"),
    severity: asSeverity(meta.severity ?? "INFO"),
    category: pickString(meta, "category") ?? "AUDIT",
    eventType: input.action,
    resource: input.resource,
    action: input.action,
    result: pickString(meta, "result", "outcome", "status"),
    ipAddress: input.ipAddress ?? null,
    deviceId: pickString(meta, "deviceId", "device_id"),
    correlationId:
      pickString(meta, "correlationId", "correlation_id") ?? eventId,
    riskScore: pickNumber(meta, "riskScore", "score"),
    zeroTrustRisk: pickString(meta, "zeroTrustRisk", "riskLevel"),
    incidentId: pickString(meta, "incidentId"),
    complianceFramework: pickString(
      meta,
      "complianceFramework",
      "framework",
    ),
    metadata: {
      ...meta,
      source: "audit",
      resourceId: input.resourceId ?? null,
      userAgent: input.userAgent ?? null,
    },
  };
}

export function createTestSiemEvent(): SiemEvent {
  const eventId = randomUUID();
  return {
    eventId,
    timestamp: new Date().toISOString(),
    tenantId: getSiemConfig().tenantId,
    userId: null,
    sessionId: null,
    severity: "INFO",
    category: "SIEM",
    eventType: "SIEM_CONNECTIVITY_TEST",
    resource: "siem",
    action: "test",
    result: "test",
    ipAddress: null,
    deviceId: null,
    correlationId: eventId,
    riskScore: null,
    zeroTrustRisk: null,
    incidentId: null,
    complianceFramework: null,
    metadata: {
      source: "siem_test",
      isTest: true,
      synthetic: true,
      message: "EliteFlow SIEM connectivity test event — safe synthetic payload",
    },
  };
}
