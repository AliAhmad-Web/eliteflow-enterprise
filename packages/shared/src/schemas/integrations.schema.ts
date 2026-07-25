import { z } from "zod";

import { uuidSchema } from "./common.schema.js";

// =============================================================================
// Phase 19.1 — Integration Architecture Schemas
// =============================================================================

export const INTEGRATION_CONNECTION_STATUSES = [
  "AVAILABLE",
  "CONNECTED",
  "DISCONNECTED",
  "ERROR",
  "DISABLED",
] as const;

export const INTEGRATION_HEALTH_STATUSES = [
  "HEALTHY",
  "DEGRADED",
  "UNHEALTHY",
  "UNKNOWN",
] as const;

export const INTEGRATION_SYNC_STATUSES = [
  "PENDING",
  "RUNNING",
  "SUCCESS",
  "PARTIAL",
  "FAILED",
  "CANCELLED",
] as const;

export const INTEGRATION_LOG_LEVELS = [
  "INFO",
  "WARNING",
  "ERROR",
  "DEBUG",
] as const;

export const INTEGRATION_SLUGS = [
  "gmail",
  "google_calendar",
  "github",
  "gemini",
  "openai",
  "stripe",
  "cloudinary",
  "supabase",
  "resend",
] as const;

export const integrationConnectionStatusSchema = z.enum(
  INTEGRATION_CONNECTION_STATUSES,
);
export const integrationHealthStatusSchema = z.enum(INTEGRATION_HEALTH_STATUSES);
export const integrationSyncStatusSchema = z.enum(INTEGRATION_SYNC_STATUSES);
export const integrationLogLevelSchema = z.enum(INTEGRATION_LOG_LEVELS);
export const integrationSlugSchema = z.enum(INTEGRATION_SLUGS);

export const listIntegrationsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: integrationConnectionStatusSchema.optional(),
  healthStatus: integrationHealthStatusSchema.optional(),
  connected: z.enum(["true", "false"]).optional(),
  category: z.string().trim().max(60).optional(),
});

export type ListIntegrationsQueryInput = z.infer<
  typeof listIntegrationsQuerySchema
>;

export const integrationIdParamsSchema = z.object({
  id: uuidSchema,
});

export type IntegrationIdParamsInput = z.infer<typeof integrationIdParamsSchema>;

export const connectIntegrationSchema = z.object({
  integrationId: uuidSchema.optional(),
  slug: integrationSlugSchema.optional(),
  /** Placeholder connection label — real OAuth lands in later phases. */
  label: z.string().trim().max(120).optional(),
  /** Simulated credential payload (stored encrypted; never returned). */
  secret: z.string().trim().min(8).max(4000).optional(),
}).refine((data) => Boolean(data.integrationId || data.slug), {
  message: "integrationId or slug is required",
  path: ["integrationId"],
});

export type ConnectIntegrationInput = z.infer<typeof connectIntegrationSchema>;

export const disconnectIntegrationSchema = z.object({
  integrationId: uuidSchema.optional(),
  slug: integrationSlugSchema.optional(),
}).refine((data) => Boolean(data.integrationId || data.slug), {
  message: "integrationId or slug is required",
  path: ["integrationId"],
});

export type DisconnectIntegrationInput = z.infer<
  typeof disconnectIntegrationSchema
>;

export const testIntegrationSchema = z.object({
  integrationId: uuidSchema.optional(),
  slug: integrationSlugSchema.optional(),
}).refine((data) => Boolean(data.integrationId || data.slug), {
  message: "integrationId or slug is required",
  path: ["integrationId"],
});

export type TestIntegrationInput = z.infer<typeof testIntegrationSchema>;

export const listIntegrationLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  integrationId: uuidSchema.optional(),
  level: integrationLogLevelSchema.optional(),
  search: z.string().trim().max(120).optional(),
});

export type ListIntegrationLogsQueryInput = z.infer<
  typeof listIntegrationLogsQuerySchema
>;

export const listSyncHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  integrationId: uuidSchema.optional(),
  status: integrationSyncStatusSchema.optional(),
});

export type ListSyncHistoryQueryInput = z.infer<
  typeof listSyncHistoryQuerySchema
>;

// =============================================================================
// Phase 19.2 — OAuth provider routes
// =============================================================================

export const OAUTH_INTEGRATION_PROVIDERS = [
  "gmail",
  "google-calendar",
  "github",
] as const;

export const oauthIntegrationProviderSchema = z.enum(OAUTH_INTEGRATION_PROVIDERS);

export type OAuthIntegrationProviderValue = z.infer<
  typeof oauthIntegrationProviderSchema
>;

export const oauthProviderParamsSchema = z.object({
  provider: oauthIntegrationProviderSchema,
});

export type OAuthProviderParamsInput = z.infer<typeof oauthProviderParamsSchema>;

export const oauthCallbackQuerySchema = z.object({
  code: z.string().trim().min(1).max(4000).optional(),
  state: z.string().trim().min(1).max(4000),
  error: z.string().trim().max(500).optional(),
  error_description: z.string().trim().max(1000).optional(),
});

export type OAuthCallbackQueryInput = z.infer<typeof oauthCallbackQuerySchema>;

// =============================================================================
// Phase 19.3 — API-key providers (Gemini, Stripe, Cloudinary, Resend, Supabase)
// =============================================================================

export const API_KEY_INTEGRATION_PROVIDERS = [
  "gemini",
  "openai",
  "stripe",
  "cloudinary",
  "supabase",
  "resend",
] as const;

export const apiKeyIntegrationProviderSchema = z.enum(
  API_KEY_INTEGRATION_PROVIDERS,
);

export type ApiKeyIntegrationProviderValue = z.infer<
  typeof apiKeyIntegrationProviderSchema
>;

export const apiKeyProviderParamsSchema = z.object({
  provider: apiKeyIntegrationProviderSchema,
});

export type ApiKeyProviderParamsInput = z.infer<
  typeof apiKeyProviderParamsSchema
>;

export const connectApiKeyIntegrationSchema = z.object({
  secret: z.string().trim().min(8).max(4000).optional(),
  label: z.string().trim().max(120).optional(),
});

export type ConnectApiKeyIntegrationInput = z.infer<
  typeof connectApiKeyIntegrationSchema
>;

export const integrationSlugParamsSchema = z.object({
  slug: integrationSlugSchema,
});

export type IntegrationSlugParamsInput = z.infer<
  typeof integrationSlugParamsSchema
>;

export const AI_PROVIDER_IDS = ["gemini", "openai", "claude", "mock"] as const;
export const aiProviderIdSchema = z.enum(AI_PROVIDER_IDS);
export type AiProviderIdValue = z.infer<typeof aiProviderIdSchema>;

// =============================================================================
// Phase 19.4 — Monitoring, Sync Engine, Queue, Scheduler, Alerts
// =============================================================================

export const SYNC_SCHEDULER_PRESETS = [
  "every_5_minutes",
  "every_15_minutes",
  "every_30_minutes",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "custom_cron",
] as const;

export const syncSchedulerPresetSchema = z.enum(SYNC_SCHEDULER_PRESETS);
export type SyncSchedulerPresetValue = z.infer<typeof syncSchedulerPresetSchema>;

export const INTEGRATION_ALERT_TYPES = [
  "integration_offline",
  "api_limit_reached",
  "authentication_expired",
  "token_expired",
  "sync_failed",
  "webhook_failed",
  "high_response_time",
] as const;

export const integrationAlertTypeSchema = z.enum(INTEGRATION_ALERT_TYPES);
export type IntegrationAlertTypeValue = z.infer<
  typeof integrationAlertTypeSchema
>;

export const INTEGRATION_ALERT_SEVERITIES = [
  "info",
  "warning",
  "critical",
] as const;

export const integrationAlertSeveritySchema = z.enum(
  INTEGRATION_ALERT_SEVERITIES,
);

export const updateSchedulerConfigSchema = z
  .object({
    enabled: z.boolean(),
    preset: syncSchedulerPresetSchema,
    cronExpression: z.string().trim().max(120).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.preset === "custom_cron" && !data.cronExpression?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "cronExpression is required for custom_cron",
        path: ["cronExpression"],
      });
    }
  });

export type UpdateSchedulerConfigInput = z.infer<
  typeof updateSchedulerConfigSchema
>;

export const syncJobIdParamsSchema = z.object({
  jobId: uuidSchema,
});

export type SyncJobIdParamsInput = z.infer<typeof syncJobIdParamsSchema>;

export const listIntegrationAlertsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  integrationId: uuidSchema.optional(),
  type: integrationAlertTypeSchema.optional(),
  acknowledged: z.enum(["true", "false"]).optional(),
});

export type ListIntegrationAlertsQueryInput = z.infer<
  typeof listIntegrationAlertsQuerySchema
>;

export const acknowledgeAlertSchema = z.object({
  alertId: uuidSchema,
});

export type AcknowledgeAlertInput = z.infer<typeof acknowledgeAlertSchema>;

export const manualSyncSchema = z.object({
  direction: z.enum(["inbound", "outbound", "bidirectional"]).default("inbound"),
});

export type ManualSyncInput = z.infer<typeof manualSyncSchema>;
