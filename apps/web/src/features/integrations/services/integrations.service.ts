import {
  INTEGRATIONS_API_PREFIX,
  type ApiKeyIntegrationProviderValue,
  type ConnectApiKeyIntegrationInput,
  type ConnectIntegrationInput,
  type DisconnectIntegrationInput,
  type IntegrationAlertDto,
  type IntegrationConnectResponse,
  type IntegrationDetailDto,
  type IntegrationDisconnectResponse,
  type IntegrationLogListResponse,
  type IntegrationMonitoringOverviewDto,
  type IntegrationOverviewDto,
  type IntegrationPlatformDetailDto,
  type IntegrationProviderStatusDto,
  type IntegrationTestResponse,
  type ListIntegrationLogsQueryInput,
  type ListIntegrationsQueryInput,
  type ListSyncHistoryQueryInput,
  type ManualSyncInput,
  type OAuthIntegrationProviderValue,
  type SyncHistoryListResponse,
  type SyncQueueJobDto,
  type SyncQueueOverviewDto,
  type SyncSchedulerConfigDto,
  type TestIntegrationInput,
  type UpdateSchedulerConfigInput,
  type WebhookMonitorOverviewDto,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

const OAUTH_SLUG_TO_PROVIDER: Record<string, OAuthIntegrationProviderValue> = {
  gmail: "gmail",
  google_calendar: "google-calendar",
  github: "github",
};

const API_KEY_SLUG_TO_PROVIDER: Record<string, ApiKeyIntegrationProviderValue> =
  {
    gemini: "gemini",
    openai: "openai",
    stripe: "stripe",
    cloudinary: "cloudinary",
    supabase: "supabase",
    resend: "resend",
  };

export function resolveOAuthProvider(
  slug: string,
): OAuthIntegrationProviderValue | null {
  return OAUTH_SLUG_TO_PROVIDER[slug] ?? null;
}

export function resolveApiKeyProvider(
  slug: string,
): ApiKeyIntegrationProviderValue | null {
  return API_KEY_SLUG_TO_PROVIDER[slug] ?? null;
}

export const integrationsService = {
  list(query: Partial<ListIntegrationsQueryInput> = {}) {
    return apiRequest<IntegrationOverviewDto>(
      `${INTEGRATIONS_API_PREFIX}${toQuery({
        search: query.search,
        status: query.status,
        healthStatus: query.healthStatus,
        connected: query.connected,
        category: query.category,
      })}`,
      { auth: true },
    );
  },

  getById(id: string) {
    return apiRequest<IntegrationDetailDto>(
      `${INTEGRATIONS_API_PREFIX}/${id}`,
      { auth: true },
    );
  },

  getBySlug(slug: string) {
    return apiRequest<IntegrationDetailDto>(
      `${INTEGRATIONS_API_PREFIX}/by-slug/${slug}`,
      { auth: true },
    );
  },

  connect(body: ConnectIntegrationInput) {
    return apiRequest<IntegrationConnectResponse>(
      `${INTEGRATIONS_API_PREFIX}/connect`,
      { method: "POST", body, auth: true },
    );
  },

  /** Phase 19.2 — provider-specific OAuth connect */
  connectProvider(provider: OAuthIntegrationProviderValue) {
    return apiRequest<IntegrationConnectResponse>(
      `${INTEGRATIONS_API_PREFIX}/${provider}/connect`,
      { method: "POST", body: {}, auth: true },
    );
  },

  connectApiKeyProvider(
    provider: ApiKeyIntegrationProviderValue,
    body: ConnectApiKeyIntegrationInput = {},
  ) {
    return apiRequest<IntegrationConnectResponse>(
      `${INTEGRATIONS_API_PREFIX}/${provider}/connect`,
      { method: "POST", body, auth: true },
    );
  },

  disconnect(body: DisconnectIntegrationInput) {
    return apiRequest<IntegrationDisconnectResponse>(
      `${INTEGRATIONS_API_PREFIX}/disconnect`,
      { method: "POST", body, auth: true },
    );
  },

  disconnectProvider(provider: OAuthIntegrationProviderValue) {
    return apiRequest<IntegrationDisconnectResponse>(
      `${INTEGRATIONS_API_PREFIX}/${provider}/disconnect`,
      { method: "POST", body: {}, auth: true },
    );
  },

  disconnectApiKeyProvider(provider: ApiKeyIntegrationProviderValue) {
    return apiRequest<IntegrationDisconnectResponse>(
      `${INTEGRATIONS_API_PREFIX}/${provider}/disconnect`,
      { method: "POST", body: {}, auth: true },
    );
  },

  test(body: TestIntegrationInput) {
    return apiRequest<IntegrationTestResponse>(
      `${INTEGRATIONS_API_PREFIX}/test`,
      { method: "POST", body, auth: true },
    );
  },

  testProvider(provider: OAuthIntegrationProviderValue) {
    return apiRequest<IntegrationTestResponse>(
      `${INTEGRATIONS_API_PREFIX}/${provider}/test`,
      { method: "POST", body: {}, auth: true },
    );
  },

  testApiKeyProvider(provider: ApiKeyIntegrationProviderValue) {
    return apiRequest<IntegrationTestResponse>(
      `${INTEGRATIONS_API_PREFIX}/${provider}/test`,
      { method: "POST", body: {}, auth: true },
    );
  },

  status(provider: OAuthIntegrationProviderValue | ApiKeyIntegrationProviderValue) {
    return apiRequest<IntegrationProviderStatusDto>(
      `${INTEGRATIONS_API_PREFIX}/${provider}/status`,
      { auth: true },
    );
  },

  logs(query: Partial<ListIntegrationLogsQueryInput> = {}) {
    return apiRequest<IntegrationLogListResponse>(
      `${INTEGRATIONS_API_PREFIX}/logs${toQuery({
        page: query.page,
        pageSize: query.pageSize,
        integrationId: query.integrationId,
        level: query.level,
        search: query.search,
      })}`,
      { auth: true },
    );
  },

  history(query: Partial<ListSyncHistoryQueryInput> = {}) {
    return apiRequest<SyncHistoryListResponse>(
      `${INTEGRATIONS_API_PREFIX}/history${toQuery({
        page: query.page,
        pageSize: query.pageSize,
        integrationId: query.integrationId,
        status: query.status,
      })}`,
      { auth: true },
    );
  },

  monitoringOverview() {
    return apiRequest<IntegrationMonitoringOverviewDto>(
      `${INTEGRATIONS_API_PREFIX}/monitoring`,
      { auth: true },
    );
  },

  queueOverview() {
    return apiRequest<SyncQueueOverviewDto>(
      `${INTEGRATIONS_API_PREFIX}/queue`,
      { auth: true },
    );
  },

  queueForIntegration(idOrSlug: string) {
    return apiRequest<SyncQueueOverviewDto>(
      `${INTEGRATIONS_API_PREFIX}/queue/${idOrSlug}`,
      { auth: true },
    );
  },

  webhookMonitor() {
    return apiRequest<WebhookMonitorOverviewDto>(
      `${INTEGRATIONS_API_PREFIX}/webhooks/monitor`,
      { auth: true },
    );
  },

  webhookMonitorForIntegration(idOrSlug: string) {
    return apiRequest<WebhookMonitorOverviewDto>(
      `${INTEGRATIONS_API_PREFIX}/webhooks/monitor/${idOrSlug}`,
      { auth: true },
    );
  },

  platformDetail(idOrSlug: string) {
    return apiRequest<IntegrationPlatformDetailDto>(
      `${INTEGRATIONS_API_PREFIX}/platform/${idOrSlug}`,
      { auth: true },
    );
  },

  manualSync(idOrSlug: string, body: ManualSyncInput = { direction: "inbound" }) {
    return apiRequest<SyncQueueJobDto>(
      `${INTEGRATIONS_API_PREFIX}/${idOrSlug}/sync`,
      { method: "POST", body, auth: true },
    );
  },

  retrySync(jobId: string) {
    return apiRequest<SyncQueueJobDto>(
      `${INTEGRATIONS_API_PREFIX}/sync/${jobId}/retry`,
      { method: "POST", body: {}, auth: true },
    );
  },

  cancelSync(jobId: string) {
    return apiRequest<SyncQueueJobDto>(
      `${INTEGRATIONS_API_PREFIX}/sync/${jobId}/cancel`,
      { method: "POST", body: {}, auth: true },
    );
  },

  updateScheduler(idOrSlug: string, body: UpdateSchedulerConfigInput) {
    return apiRequest<SyncSchedulerConfigDto>(
      `${INTEGRATIONS_API_PREFIX}/${idOrSlug}/scheduler`,
      { method: "PUT", body, auth: true },
    );
  },

  acknowledgeAlert(alertId: string) {
    return apiRequest<IntegrationAlertDto>(
      `${INTEGRATIONS_API_PREFIX}/alerts/${alertId}/acknowledge`,
      { method: "POST", body: {}, auth: true },
    );
  },

  evaluateAlerts() {
    return apiRequest<IntegrationAlertDto[]>(
      `${INTEGRATIONS_API_PREFIX}/alerts/evaluate`,
      { method: "POST", body: {}, auth: true },
    );
  },
};
