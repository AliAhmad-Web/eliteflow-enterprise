// =============================================================================
// Phase 19.1 / 19.2 — Integration Types
// =============================================================================

export type IntegrationConnectionStatusValue =
  | "AVAILABLE"
  | "CONNECTED"
  | "DISCONNECTED"
  | "ERROR"
  | "DISABLED";

export type IntegrationHealthStatusValue =
  | "HEALTHY"
  | "DEGRADED"
  | "UNHEALTHY"
  | "UNKNOWN";

export type IntegrationSyncStatusValue =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "PARTIAL"
  | "FAILED"
  | "CANCELLED";

export type IntegrationLogLevelValue = "INFO" | "WARNING" | "ERROR" | "DEBUG";

export interface IntegrationDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  provider: string;
  category: string;
  logoKey: string;
  status: IntegrationConnectionStatusValue;
  healthStatus: IntegrationHealthStatusValue;
  healthMessage: string | null;
  isConnected: boolean;
  connectedAt: string | null;
  disconnectedAt: string | null;
  lastSyncAt: string | null;
  lastHealthCheckAt: string | null;
  visibleToEmployee: boolean;
  visibleToClient: boolean;
  sortOrder: number;
  hasCredentials: boolean;
  webhookCount: number;
  lastError: string | null;
  apiVersion: string | null;
  successRate: number | null;
  accountLabel: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationOverviewDto {
  connectedCount: number;
  disconnectedCount: number;
  totalCount: number;
  healthyCount: number;
  failedCount: number;
  syncJobsToday: number;
  successRate: number;
  healthScore: number;
  canManage: boolean;
  integrations: IntegrationDto[];
}

export interface IntegrationApiUsageDto {
  requestsToday: number;
  monthlyRequests: number;
  remainingQuota: number | null;
  rateLimitPerMinute: number | null;
  averageResponseMs: number | null;
  updatedAt: string;
}

export interface IntegrationHealthTimelinePoint {
  at: string;
  healthStatus: IntegrationHealthStatusValue | string;
  message: string;
  action: string;
}

export interface IntegrationDetailDto extends IntegrationDto {
  config: Record<string, unknown> | null;
  recentLogs: IntegrationLogDto[];
  recentSyncs: SyncHistoryDto[];
  webhooks: WebhookEndpointDto[];
  /** Phase 19.3 — API usage snapshot (from encrypted config; no secrets). */
  apiUsage: IntegrationApiUsageDto | null;
  healthTimeline: IntegrationHealthTimelinePoint[];
  retryHistory: SyncHistoryDto[];
  errorHistory: IntegrationLogDto[];
}

export interface IntegrationLogDto {
  id: string;
  integrationId: string;
  integrationName: string | null;
  level: IntegrationLogLevelValue;
  action: string;
  message: string;
  metadata: Record<string, unknown> | null;
  userId: string | null;
  createdAt: string;
}

export interface SyncHistoryDto {
  id: string;
  integrationId: string;
  integrationName: string | null;
  status: IntegrationSyncStatusValue;
  direction: string;
  recordsProcessed: number;
  recordsFailed: number;
  message: string | null;
  metadata: Record<string, unknown> | null;
  retryCount: number;
  failureReason: string | null;
  lastRetryAt: string | null;
  triggeredById: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface WebhookEndpointDto {
  id: string;
  integrationId: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastReceivedAt: string | null;
  lastDeliveryStatus: string | null;
  hasSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationConnectResponse {
  message: string;
  authorizeUrl?: string;
  integration?: IntegrationDto;
}

export interface IntegrationDisconnectResponse {
  message: string;
  integration: IntegrationDto;
}

export interface IntegrationTestResponse {
  message: string;
  healthy: boolean;
  healthStatus: IntegrationHealthStatusValue;
  integration: IntegrationDto;
}

export interface IntegrationLogListResponse {
  items: IntegrationLogDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SyncHistoryListResponse {
  items: SyncHistoryDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
