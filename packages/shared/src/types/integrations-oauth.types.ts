// =============================================================================
// Phase 19.2 — Integration OAuth / KPI Types
// =============================================================================

import type {
  IntegrationConnectionStatusValue,
  IntegrationDto,
  IntegrationHealthStatusValue,
} from "./integrations.types.js";

export type OAuthIntegrationProvider =
  | "gmail"
  | "google-calendar"
  | "github";

export type ApiKeyIntegrationProvider =
  | "gemini"
  | "openai"
  | "stripe"
  | "cloudinary"
  | "supabase"
  | "resend";

export type IntegrationProviderRoute =
  | OAuthIntegrationProvider
  | ApiKeyIntegrationProvider;

export interface IntegrationOAuthConnectResponse {
  message: string;
  /** When set, frontend should redirect the browser to complete OAuth. */
  authorizeUrl?: string;
  /** Present when connection completed without browser redirect (dev mock). */
  integration?: IntegrationDto;
}

export interface IntegrationProviderStatusDto {
  provider: IntegrationProviderRoute;
  slug: string;
  name: string;
  isConnected: boolean;
  status: IntegrationConnectionStatusValue;
  healthStatus: IntegrationHealthStatusValue;
  healthMessage: string | null;
  lastSyncAt: string | null;
  lastHealthCheckAt: string | null;
  lastError: string | null;
  apiVersion: string | null;
  successRate: number | null;
  tokenExpiresAt: string | null;
  accountLabel: string | null;
  scopes: string[];
  webhookReady: boolean;
  syncStatus: string | null;
}

export interface IntegrationOverviewKpis {
  totalCount: number;
  connectedCount: number;
  disconnectedCount: number;
  healthyCount: number;
  failedCount: number;
  syncJobsToday: number;
  successRate: number;
  healthScore: number;
}
