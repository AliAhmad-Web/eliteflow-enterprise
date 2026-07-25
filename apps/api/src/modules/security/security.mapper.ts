import type {
  ActiveDeviceDto,
  LoginHistoryDto,
  PasswordHistoryItemDto,
  SecurityAuditLogDto,
  SecurityEventDto,
} from "@enterprise/shared";

function displayName(
  firstName?: string | null,
  lastName?: string | null,
): string | null {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || null;
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
    email: row.email,
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
    userEmail: row.user?.email ?? null,
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
  user?: {
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}): SecurityAuditLogDto {
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.user?.email ?? null,
    userName: row.user
      ? displayName(row.user.firstName, row.user.lastName)
      : null,
    action: row.action,
    resource: row.resource,
    resourceId: row.resourceId,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
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
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.user?.email ?? null,
    severity: row.severity,
    category: row.category,
    eventType: row.eventType,
    message: row.message,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
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
