// =============================================================================
// Phase 19.4 — Monitoring, Sync Engine, Queue, Scheduler, Alerts
// =============================================================================

import type { ChartPoint } from "../schemas/reports.schema.js";
import type {
  IntegrationConnectionStatusValue,
  IntegrationHealthStatusValue,
  IntegrationSyncStatusValue,
  SyncHistoryDto,
  WebhookEndpointDto,
} from "./integrations.types.js";

export type SyncSchedulerPresetValue =
  | "every_5_minutes"
  | "every_15_minutes"
  | "every_30_minutes"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "custom_cron";

export type IntegrationAlertTypeValue =
  | "integration_offline"
  | "api_limit_reached"
  | "authentication_expired"
  | "token_expired"
  | "sync_failed"
  | "webhook_failed"
  | "high_response_time";

export type IntegrationAlertSeverityValue = "info" | "warning" | "critical";

export interface IntegrationLiveMonitoringDto {
  integrationId: string;
  slug: string;
  name: string;
  currentStatus: IntegrationConnectionStatusValue;
  healthStatus: IntegrationHealthStatusValue;
  uptimePercentage: number;
  responseTimeMs: number | null;
  lastSuccessfulSyncAt: string | null;
  lastFailedSyncAt: string | null;
  successRate: number | null;
  failureRate: number | null;
  activeConnection: boolean;
  connectionDurationMs: number | null;
  lastHealthCheckAt: string | null;
  lastError: string | null;
}

export interface IntegrationMonitoringOverviewDto {
  monitoredCount: number;
  healthyCount: number;
  unhealthyCount: number;
  averageUptimePercentage: number;
  averageResponseTimeMs: number | null;
  openAlertCount: number;
  queueLength: number;
  items: IntegrationLiveMonitoringDto[];
}

export interface SyncQueueJobDto extends SyncHistoryDto {
  /** Display status — SUCCESS mapped as Completed for Sync Engine UX. */
  displayStatus:
    | "Pending"
    | "Running"
    | "Completed"
    | "Failed"
    | "Cancelled"
    | "Partial";
}

export interface SyncQueueOverviewDto {
  queueLength: number;
  pendingJobs: number;
  runningJobs: number;
  failedJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  jobs: SyncQueueJobDto[];
}

export interface SyncSchedulerConfigDto {
  enabled: boolean;
  preset: SyncSchedulerPresetValue;
  cronExpression: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  /** Architecture-only — scheduler does not execute jobs in Phase 19.4. */
  architectureOnly: true;
}

export interface WebhookMonitorOverviewDto {
  totalWebhooks: number;
  active: number;
  disabled: number;
  failedDeliveries: number;
  successfulDeliveries: number;
  retryCount: number;
  averageDeliveryTimeMs: number | null;
  lastDeliveryAt: string | null;
  endpoints: WebhookEndpointDto[];
}

export interface IntegrationUsageAnalyticsDto {
  requestsToday: number;
  monthlyRequests: number;
  remainingQuota: number | null;
  rateLimitPerMinute: number | null;
  averageResponseMs: number | null;
  rateLimitUsagePercent: number | null;
  dailyRequests: ChartPoint[];
  weeklyRequests: ChartPoint[];
  monthlyRequestsSeries: ChartPoint[];
  successRequests: ChartPoint[];
  failedRequests: ChartPoint[];
  averageResponseTimeSeries: ChartPoint[];
}

export interface IntegrationAlertDto {
  id: string;
  integrationId: string;
  integrationName: string | null;
  integrationSlug: string | null;
  type: IntegrationAlertTypeValue;
  severity: IntegrationAlertSeverityValue;
  title: string;
  message: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export interface IntegrationAlertListResponse {
  items: IntegrationAlertDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface IntegrationPlatformDetailDto {
  monitoring: IntegrationLiveMonitoringDto;
  queue: SyncQueueOverviewDto;
  scheduler: SyncSchedulerConfigDto;
  webhooks: WebhookMonitorOverviewDto;
  usage: IntegrationUsageAnalyticsDto;
  alerts: IntegrationAlertDto[];
  configuration: {
    connectionMode: string | null;
    apiVersion: string | null;
    accountLabel: string | null;
    phase: string | null;
    architecture: Record<string, unknown> | null;
  };
}
