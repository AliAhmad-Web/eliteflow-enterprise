import type {
  Integration,
  IntegrationLog,
  SyncHistory,
  WebhookEndpoint,
} from "@enterprise/database";
import type {
  IntegrationApiUsageDto,
  IntegrationDetailDto,
  IntegrationDto,
  IntegrationHealthTimelinePoint,
  IntegrationLogDto,
  SyncHistoryDto,
  WebhookEndpointDto,
} from "@enterprise/shared";

import { getIntegrationImplementationStatus } from "./integrations.constants.js";

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readConfigString(
  config: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = config?.[key];
  return typeof value === "string" ? value : null;
}

function mapApiUsage(
  config: Record<string, unknown> | null,
): IntegrationApiUsageDto | null {
  const raw = config?.usage;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  return {
    requestsToday:
      typeof row.requestsToday === "number" ? row.requestsToday : 0,
    monthlyRequests:
      typeof row.monthlyRequests === "number" ? row.monthlyRequests : 0,
    remainingQuota:
      typeof row.remainingQuota === "number" ? row.remainingQuota : null,
    rateLimitPerMinute:
      typeof row.rateLimitPerMinute === "number"
        ? row.rateLimitPerMinute
        : null,
    averageResponseMs:
      typeof row.averageResponseMs === "number"
        ? row.averageResponseMs
        : null,
    updatedAt:
      typeof row.updatedAt === "string"
        ? row.updatedAt
        : new Date().toISOString(),
  };
}

export function mapIntegrationDto(
  row: Integration & {
    _count?: { credentials?: number; webhooks?: number };
  },
  extras?: { successRate?: number | null },
): IntegrationDto {
  const config = asRecord(row.config);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    provider: row.provider,
    category: row.category,
    logoKey: row.logoKey,
    status: row.status,
    healthStatus: row.healthStatus,
    healthMessage: row.healthMessage,
    isConnected: row.isConnected,
    implementationStatus: getIntegrationImplementationStatus(row.slug),
    connectedAt: toIso(row.connectedAt),
    disconnectedAt: toIso(row.disconnectedAt),
    lastSyncAt: toIso(row.lastSyncAt),
    lastHealthCheckAt: toIso(row.lastHealthCheckAt),
    visibleToEmployee: row.visibleToEmployee,
    visibleToClient: row.visibleToClient,
    sortOrder: row.sortOrder,
    hasCredentials: (row._count?.credentials ?? 0) > 0,
    webhookCount: row._count?.webhooks ?? 0,
    lastError: readConfigString(config, "lastError"),
    apiVersion: readConfigString(config, "apiVersion"),
    successRate: extras?.successRate ?? null,
    accountLabel: readConfigString(config, "accountLabel"),
    tokenExpiresAt: readConfigString(config, "tokenExpiresAt"),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapIntegrationDetailDto(
  row: Integration & {
    _count?: { credentials?: number; webhooks?: number };
    logs?: Array<IntegrationLog & { integration?: { name: string } | null }>;
    syncHistory?: Array<
      SyncHistory & { integration?: { name: string } | null }
    >;
    webhooks?: WebhookEndpoint[];
  },
  extras?: { successRate?: number | null },
): IntegrationDetailDto {
  const recentLogs = (row.logs ?? []).map(mapIntegrationLogDto);
  const recentSyncs = (row.syncHistory ?? []).map(mapSyncHistoryDto);
  const healthTimeline: IntegrationHealthTimelinePoint[] = recentLogs
    .filter(
      (log) =>
        log.action === "health_check" ||
        log.action === "connect" ||
        log.action === "connect_failed" ||
        log.action === "disconnect",
    )
    .map((log) => ({
      at: log.createdAt,
      healthStatus:
        typeof log.metadata?.healthStatus === "string"
          ? log.metadata.healthStatus
          : log.level === "ERROR"
            ? "UNHEALTHY"
            : "HEALTHY",
      message: log.message,
      action: log.action,
    }));

  return {
    ...mapIntegrationDto(row, extras),
    config: asRecord(row.config),
    recentLogs,
    recentSyncs,
    webhooks: (row.webhooks ?? []).map(mapWebhookEndpointDto),
    apiUsage: mapApiUsage(asRecord(row.config)),
    healthTimeline,
    retryHistory: recentSyncs.filter((sync) => sync.retryCount > 0),
    errorHistory: recentLogs.filter((log) => log.level === "ERROR"),
  };
}

export function mapIntegrationLogDto(
  row: IntegrationLog & { integration?: { name: string } | null },
): IntegrationLogDto {
  return {
    id: row.id,
    integrationId: row.integrationId,
    integrationName: row.integration?.name ?? null,
    level: row.level,
    action: row.action,
    message: row.message,
    metadata: asRecord(row.metadata),
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapSyncHistoryDto(
  row: SyncHistory & { integration?: { name: string } | null },
): SyncHistoryDto {
  return {
    id: row.id,
    integrationId: row.integrationId,
    integrationName: row.integration?.name ?? null,
    status: row.status,
    direction: row.direction,
    recordsProcessed: row.recordsProcessed,
    recordsFailed: row.recordsFailed,
    message: row.message,
    metadata: asRecord(row.metadata),
    retryCount: row.retryCount ?? 0,
    failureReason: row.failureReason ?? null,
    lastRetryAt: toIso(row.lastRetryAt),
    triggeredById: row.triggeredById,
    startedAt: row.startedAt.toISOString(),
    completedAt: toIso(row.completedAt),
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapWebhookEndpointDto(row: WebhookEndpoint): WebhookEndpointDto {
  return {
    id: row.id,
    integrationId: row.integrationId,
    url: row.url,
    events: row.events,
    isActive: row.isActive,
    lastReceivedAt: toIso(row.lastReceivedAt),
    lastDeliveryStatus: row.lastDeliveryStatus,
    hasSecret: Boolean(row.encryptedSecret),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
