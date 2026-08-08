import type {
  ActiveDeviceDto,
  LoginHistoryDto,
  PasswordHistoryItemDto,
  SecurityAuditLogDto,
  SecurityEventDto,
  SecurityIncidentDto,
} from "@enterprise/shared";
import {
  maskEmail,
  sanitizeAuditMetadata,
  sanitizeForLogging,
} from "@enterprise/shared";

function displayName(
  firstName?: string | null,
  lastName?: string | null,
): string | null {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || null;
}

function safeMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object") return null;
  return sanitizeAuditMetadata(metadata as Record<string, unknown>) ?? null;
}

export function toLoginHistoryDto(row: {
  id: string;
  email: string;
  userId: string | null;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason: string | null;
  createdAt: Date;
}): LoginHistoryDto {
  return {
    id: row.id,
    email: maskEmail(row.email),
    userId: row.userId,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    success: row.success,
    failureReason: row.failureReason,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toActiveDeviceDto(
  row: {
    id: string;
    userId: string;
    deviceName: string;
    ipAddress: string;
    userAgent: string;
    lastActiveAt: Date;
    createdAt: Date;
    user?: {
      email: string;
      firstName: string;
      lastName: string;
    } | null;
  },
  currentSessionId?: string,
): ActiveDeviceDto {
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.user?.email ? maskEmail(row.user.email) : null,
    userName: row.user
      ? displayName(row.user.firstName, row.user.lastName)
      : null,
    deviceName: row.deviceName,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    lastActiveAt: row.lastActiveAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    isCurrent: currentSessionId ? row.id === currentSessionId : undefined,
  };
}

export function toAuditLogDto(row: {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  eventHash?: string | null;
  previousHash?: string | null;
  hashVersion?: number | null;
  timestampIntegrity?: Date | null;
  verificationStatus?: SecurityAuditLogDto["verificationStatus"];
  user?: {
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}): SecurityAuditLogDto {
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.user?.email ? maskEmail(row.user.email) : null,
    userName: row.user
      ? displayName(row.user.firstName, row.user.lastName)
      : null,
    action: row.action,
    resource: row.resource,
    resourceId: row.resourceId,
    metadata: safeMetadata(row.metadata),
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
    hash: row.eventHash ?? null,
    previousHash: row.previousHash ?? null,
    chainVersion: row.hashVersion ?? undefined,
    hashVersion: row.hashVersion ?? undefined,
    timestampIntegrity: row.timestampIntegrity?.toISOString() ?? null,
    verificationStatus: row.verificationStatus,
  };
}

export function toSecurityEventDto(row: {
  id: string;
  userId: string | null;
  severity: SecurityEventDto["severity"];
  category: SecurityEventDto["category"];
  eventType: string;
  message: string;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  user?: { email: string } | null;
}): SecurityEventDto {
  const message = sanitizeForLogging({ message: row.message }).message as string;
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.user?.email ? maskEmail(row.user.email) : null,
    severity: row.severity,
    category: row.category,
    eventType: row.eventType,
    message,
    metadata: safeMetadata(row.metadata),
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toSecurityIncidentDto(row: {
  id: string;
  type: string;
  severity: SecurityIncidentDto["severity"];
  status: SecurityIncidentDto["status"];
  actorUserId: string | null;
  resource: string | null;
  resourceId: string | null;
  count: number;
  message: string;
  metadata: unknown;
  windowStartedAt: Date;
  lastSeenAt: Date;
  resolvedAt: Date | null;
  resolvedById: string | null;
  createdAt: Date;
}): SecurityIncidentDto {
  const message = sanitizeForLogging({ message: row.message }).message as string;
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    status: row.status,
    actorUserId: row.actorUserId,
    resource: row.resource,
    resourceId: row.resourceId,
    count: row.count,
    message,
    metadata: safeMetadata(row.metadata),
    windowStartedAt: row.windowStartedAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolvedById: row.resolvedById,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toPasswordHistoryItemDto(row: {
  id: string;
  createdAt: Date;
}): PasswordHistoryItemDto {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
  };
}
