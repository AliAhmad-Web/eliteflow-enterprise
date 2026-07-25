import type { Prisma } from "@enterprise/database";
import type {
  IntegrationConnectResponse,
  IntegrationDto,
  IntegrationProviderStatusDto,
  IntegrationTestResponse,
  OAuthIntegrationProviderValue,
} from "@enterprise/shared";

import { logIntegrationsAuditEvent } from "../integrations.audit.js";
import {
  INTEGRATIONS_AUDIT_ACTIONS,
  INTEGRATIONS_MESSAGES,
} from "../integrations.constants.js";
import {
  INTEGRATIONS_ERROR_CODES,
  IntegrationsError,
} from "../integrations.errors.js";
import { mapIntegrationDto } from "../integrations.mapper.js";
import { integrationsRepository } from "../integrations.repository.js";
import type {
  IntegrationsActor,
  IntegrationsRequestContext,
} from "../integrations.types.js";
import { syncManager } from "../sync-manager.service.js";
import { webhookManager } from "../webhook-manager.service.js";
import {
  futureScopesForSlug,
  getFrontendUrl,
  getGitHubOAuthConfig,
  getGoogleOAuthConfig,
  OAUTH_API_VERSIONS,
  PROVIDER_ROUTE_TO_SLUG,
  scopesForSlug,
  SLUG_TO_ROUTE_PROVIDER,
  type OAuthSlug,
} from "./oauth-config.js";
import { createOAuthState, verifyOAuthState } from "./oauth-state.js";
import { retryManager } from "./retry-manager.service.js";
import { tokenManager } from "./token-manager.service.js";
import {
  buildGitHubAuthorizeUrl,
  exchangeGitHubCode,
  GITHUB_WEBHOOK_EVENTS,
  probeGitHubConnection,
  refreshGitHubAccessToken,
  revokeGitHubToken,
} from "../providers/github-oauth.client.js";
import {
  buildGoogleAuthorizeUrl,
  exchangeGoogleCode,
  googleWebhookEvents,
  probeGmailConnection,
  probeGoogleCalendarConnection,
  probeGoogleUserInfo,
  refreshGoogleAccessToken,
  revokeGoogleToken,
} from "../providers/google-oauth.client.js";

function asConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function isOAuthSlug(slug: string): slug is OAuthSlug {
  return slug === "gmail" || slug === "google_calendar" || slug === "github";
}

function requireOAuthSlug(provider: OAuthIntegrationProviderValue): OAuthSlug {
  return PROVIDER_ROUTE_TO_SLUG[provider];
}

async function computeSuccessRate(integrationId: string): Promise<number | null> {
  const { success, failed } =
    await integrationsRepository.countSyncOutcomes(integrationId);
  const total = success + failed;
  if (total === 0) return null;
  return Math.round((success / total) * 100);
}

function requireProviderConfigured(slug: OAuthSlug): void {
  if (slug === "github") {
    if (!getGitHubOAuthConfig().configured) {
      throw new IntegrationsError(
        "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_OAUTH_REDIRECT_URI (or APP_URL).",
        503,
        INTEGRATIONS_ERROR_CODES.VALIDATION,
      );
    }
    return;
  }
  if (!getGoogleOAuthConfig().configured) {
    throw new IntegrationsError(
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI (or APP_URL).",
      503,
      INTEGRATIONS_ERROR_CODES.VALIDATION,
    );
  }
}

/**
 * OAuthProviderService — production Gmail, Google Calendar, and GitHub OAuth.
 * Authorization code + PKCE; encrypted tokens; provider-side revoke on disconnect.
 * Does not send email, sync calendar events, or fetch repositories.
 */
export class OAuthProviderService {
  async startConnect(
    provider: OAuthIntegrationProviderValue,
    actor: IntegrationsActor,
    context: IntegrationsRequestContext,
  ): Promise<IntegrationConnectResponse> {
    await integrationsRepository.ensureCatalogSeeded();
    const slug = requireOAuthSlug(provider);
    requireProviderConfigured(slug);

    const integration = await integrationsRepository.findBySlug(slug);
    if (!integration) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_FOUND,
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }
    if (integration.isConnected) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.ALREADY_CONNECTED,
        409,
        INTEGRATIONS_ERROR_CODES.CONFLICT,
      );
    }

    const { state, codeChallenge } = createOAuthState({
      userId: actor.userId,
      slug,
    });

    const authorizeUrl =
      slug === "github"
        ? buildGitHubAuthorizeUrl({ state, codeChallenge })
        : buildGoogleAuthorizeUrl({ slug, state, codeChallenge });

    await integrationsRepository.createLog({
      integrationId: integration.id,
      level: "INFO",
      action: "oauth_authorize_started",
      message: `OAuth authorize URL issued for ${integration.name}.`,
      metadata: { phase: "19.2", provider, pkce: true },
      userId: actor.userId,
    });

    await logIntegrationsAuditEvent({
      userId: actor.userId,
      action: INTEGRATIONS_AUDIT_ACTIONS.OAUTH_STARTED,
      resourceId: integration.id,
      metadata: { slug, provider },
      context,
    });

    return {
      message: INTEGRATIONS_MESSAGES.OAUTH_REDIRECT,
      authorizeUrl,
    };
  }

  async handleOAuthCallback(input: {
    channel: "google" | "github";
    code?: string;
    state: string;
    error?: string;
    errorDescription?: string;
    context: IntegrationsRequestContext;
  }): Promise<{ redirectUrl: string }> {
    const frontend = getFrontendUrl();

    if (input.error) {
      return {
        redirectUrl: `${frontend}/integrations?oauth=error&reason=${encodeURIComponent(input.errorDescription || input.error)}`,
      };
    }

    const payload = verifyOAuthState(input.state);
    if (!input.code) {
      throw new IntegrationsError(
        "Missing OAuth authorization code",
        400,
        INTEGRATIONS_ERROR_CODES.VALIDATION,
      );
    }

    if (input.channel === "google") {
      if (payload.slug !== "gmail" && payload.slug !== "google_calendar") {
        throw new IntegrationsError(
          "OAuth state provider mismatch",
          400,
          INTEGRATIONS_ERROR_CODES.VALIDATION,
        );
      }
    } else if (payload.slug !== "github") {
      throw new IntegrationsError(
        "OAuth state provider mismatch",
        400,
        INTEGRATIONS_ERROR_CODES.VALIDATION,
      );
    }

    const integration = await integrationsRepository.findBySlug(payload.slug);
    if (!integration) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_FOUND,
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }

    try {
      if (input.channel === "google") {
        const tokens = await exchangeGoogleCode({
          code: input.code,
          codeVerifier: payload.codeVerifier,
        });
        if (!tokens.refresh_token) {
          throw new Error(
            "Google did not return a refresh token. Revoke prior app access and reconnect with consent.",
          );
        }
        const profile = await probeGoogleUserInfo(tokens.access_token);
        await this.completeConnection({
          integrationId: integration.id,
          slug: payload.slug,
          userId: payload.userId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresInSeconds: tokens.expires_in ?? null,
          tokenType: tokens.token_type ?? "Bearer",
          scope: tokens.scope ?? scopesForSlug(payload.slug).join(" "),
          accountLabel: profile.email ?? profile.name ?? null,
          context: input.context,
        });
      } else {
        const tokens = await exchangeGitHubCode({
          code: input.code,
          codeVerifier: payload.codeVerifier,
        });
        const profile = await probeGitHubConnection(tokens.access_token);
        await this.completeConnection({
          integrationId: integration.id,
          slug: "github",
          userId: payload.userId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          expiresInSeconds: tokens.expires_in ?? null,
          tokenType: tokens.token_type ?? "bearer",
          scope: tokens.scope ?? scopesForSlug("github").join(" "),
          accountLabel: profile.login ?? profile.name ?? null,
          context: input.context,
        });
      }
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "OAuth callback failed";
      await integrationsRepository.createLog({
        integrationId: integration.id,
        level: "ERROR",
        action: "oauth_callback_failed",
        message: reason.slice(0, 1000),
        metadata: { phase: "19.2" },
        userId: payload.userId,
      });
      await retryManager.recordAttempt({
        integrationId: integration.id,
        userId: payload.userId,
        success: false,
        reason,
        kind: "oauth_callback",
        retryCount: 1,
      });
      return {
        redirectUrl: `${frontend}/integrations?oauth=error&provider=${SLUG_TO_ROUTE_PROVIDER[payload.slug]}&reason=${encodeURIComponent(reason.slice(0, 180))}`,
      };
    }

    return {
      redirectUrl: `${frontend}/integrations?oauth=success&provider=${SLUG_TO_ROUTE_PROVIDER[payload.slug]}`,
    };
  }

  private async completeConnection(input: {
    integrationId: string;
    slug: OAuthSlug;
    userId: string;
    accessToken: string;
    refreshToken: string | null;
    expiresInSeconds: number | null;
    tokenType: string;
    scope: string;
    accountLabel: string | null;
    context: IntegrationsRequestContext;
  }): Promise<IntegrationDto> {
    await tokenManager.persistTokens({
      integrationId: input.integrationId,
      userId: input.userId,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      tokenType: input.tokenType,
      scope: input.scope,
      expiresInSeconds: input.expiresInSeconds,
    });

    const events =
      input.slug === "github"
        ? [...GITHUB_WEBHOOK_EVENTS]
        : googleWebhookEvents(input.slug);

    await webhookManager.ensureProviderEndpoint({
      integrationId: input.integrationId,
      slug: input.slug,
      userId: input.userId,
      events,
    });

    const expiresAt = input.expiresInSeconds
      ? new Date(Date.now() + input.expiresInSeconds * 1000).toISOString()
      : null;

    const now = new Date();
    const config: Record<string, unknown> = {
      phase: "19.2",
      connectionMode: "oauth",
      apiVersion: OAUTH_API_VERSIONS[input.slug],
      lastError: null,
      accountLabel: input.accountLabel,
      scopes: input.scope.split(/[\s,]+/).filter(Boolean),
      futureScopes: [...futureScopesForSlug(input.slug)],
      tokenExpiresAt: expiresAt,
      webhookReady: true,
      features: {
        gmail:
          input.slug === "gmail"
            ? {
                sendEmail: false,
                readInbox: false,
                labels: false,
                drafts: false,
                attachments: false,
              }
            : undefined,
        googleCalendar:
          input.slug === "google_calendar"
            ? {
                events: false,
                meetings: false,
                reminders: false,
                calendarSync: false,
              }
            : undefined,
        github:
          input.slug === "github"
            ? {
                repositories: false,
                commits: false,
                pullRequests: false,
                issues: false,
                branches: false,
              }
            : undefined,
      },
    };

    const updated = await integrationsRepository.updateConnection(
      input.integrationId,
      {
        isConnected: true,
        status: "CONNECTED",
        healthStatus: "HEALTHY",
        healthMessage: "OAuth connection established.",
        connectedAt: now,
        disconnectedAt: null,
        connectedBy: { connect: { id: input.userId } },
        lastSyncAt: now,
        lastHealthCheckAt: now,
        config: config as Prisma.InputJsonValue,
      },
    );

    await syncManager.recordConnectSync({
      integrationId: input.integrationId,
      userId: input.userId,
    });

    await integrationsRepository.createLog({
      integrationId: input.integrationId,
      level: "INFO",
      action: "connect",
      message: `${updated.name} connected via OAuth 2.0.`,
      metadata: { phase: "19.2", slug: input.slug, mode: "oauth" },
      userId: input.userId,
    });

    await logIntegrationsAuditEvent({
      userId: input.userId,
      action: INTEGRATIONS_AUDIT_ACTIONS.CONNECTED,
      resourceId: input.integrationId,
      metadata: { slug: input.slug, mode: "oauth" },
      context: input.context,
    });

    const successRate = await computeSuccessRate(input.integrationId);
    return mapIntegrationDto(updated, { successRate });
  }

  async disconnect(
    provider: OAuthIntegrationProviderValue,
    actor: IntegrationsActor,
    context: IntegrationsRequestContext,
  ) {
    await integrationsRepository.ensureCatalogSeeded();
    const slug = requireOAuthSlug(provider);
    const existing = await integrationsRepository.findBySlug(slug);
    if (!existing) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_FOUND,
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }
    if (!existing.isConnected) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_CONNECTED,
        409,
        INTEGRATIONS_ERROR_CODES.CONFLICT,
      );
    }

    const bundle = await tokenManager.readBundle(existing.id);
    if (bundle) {
      try {
        if (slug === "github") {
          await revokeGitHubToken(bundle.accessToken);
        } else {
          await revokeGoogleToken(bundle.refreshToken ?? bundle.accessToken);
        }
      } catch (error) {
        await integrationsRepository.createLog({
          integrationId: existing.id,
          level: "WARNING",
          action: "token_revoke_remote_failed",
          message:
            error instanceof Error
              ? error.message.slice(0, 1000)
              : "Remote token revoke failed",
          metadata: { phase: "19.2", slug },
          userId: actor.userId,
        });
      }
    }

    await tokenManager.revoke(existing.id, actor.userId);
    await webhookManager.deactivateAll(existing.id);

    const now = new Date();
    const updated = await integrationsRepository.updateConnection(existing.id, {
      isConnected: false,
      status: "DISCONNECTED",
      healthStatus: "UNKNOWN",
      healthMessage: "Disconnected by administrator.",
      disconnectedAt: now,
      connectedBy: { disconnect: true },
      config: {
        phase: "19.2",
        connectionMode: "disconnected",
        apiVersion: OAUTH_API_VERSIONS[slug],
        lastError: null,
        webhookReady: false,
      } as Prisma.InputJsonValue,
    });

    await integrationsRepository.createLog({
      integrationId: existing.id,
      level: "WARNING",
      action: "disconnect",
      message: `${existing.name} disconnected. Tokens revoked locally and at provider.`,
      metadata: { phase: "19.2", slug },
      userId: actor.userId,
    });

    await logIntegrationsAuditEvent({
      userId: actor.userId,
      action: INTEGRATIONS_AUDIT_ACTIONS.DISCONNECTED,
      resourceId: existing.id,
      metadata: { slug, provider },
      context,
    });

    return {
      message: INTEGRATIONS_MESSAGES.DISCONNECTED,
      integration: mapIntegrationDto(updated, { successRate: null }),
    };
  }

  async ensureFreshAccessToken(input: {
    integrationId: string;
    slug: OAuthSlug;
    userId: string;
  }): Promise<string> {
    const bundle = await tokenManager.readBundle(input.integrationId);
    if (!bundle) {
      throw new IntegrationsError(
        "No OAuth credentials found for this integration",
        400,
        INTEGRATIONS_ERROR_CODES.VALIDATION,
      );
    }

    if (!tokenManager.isExpired(bundle.expiresAt)) {
      return bundle.accessToken;
    }

    if (!bundle.refreshToken) {
      throw new IntegrationsError(
        "Access token expired and no refresh token is available — reconnect the integration.",
        401,
        INTEGRATIONS_ERROR_CODES.HEALTH_FAILED,
      );
    }

    try {
      if (input.slug === "github") {
        const refreshed = await refreshGitHubAccessToken(bundle.refreshToken);
        await tokenManager.rotateAfterRefresh({
          integrationId: input.integrationId,
          userId: input.userId,
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token ?? bundle.refreshToken,
          expiresInSeconds: refreshed.expires_in ?? null,
          tokenType: refreshed.token_type,
          scope: refreshed.scope ?? bundle.scope,
        });
        await integrationsRepository.createLog({
          integrationId: input.integrationId,
          level: "INFO",
          action: "token_refresh",
          message: "GitHub access token refreshed.",
          metadata: { phase: "19.2" },
          userId: input.userId,
        });
        await logIntegrationsAuditEvent({
          userId: input.userId,
          action: INTEGRATIONS_AUDIT_ACTIONS.TOKEN_REFRESHED,
          resourceId: input.integrationId,
          metadata: { slug: input.slug },
          context: {
            ipAddress: "0.0.0.0",
            userAgent: "token-manager",
          },
        });
        return refreshed.access_token;
      }

      const refreshed = await refreshGoogleAccessToken(bundle.refreshToken);
      await tokenManager.rotateAfterRefresh({
        integrationId: input.integrationId,
        userId: input.userId,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? bundle.refreshToken,
        expiresInSeconds: refreshed.expires_in ?? null,
        tokenType: refreshed.token_type,
        scope: refreshed.scope ?? bundle.scope,
      });
      await integrationsRepository.createLog({
        integrationId: input.integrationId,
        level: "INFO",
        action: "token_refresh",
        message: "Google access token refreshed.",
        metadata: { phase: "19.2", slug: input.slug },
        userId: input.userId,
      });
      await logIntegrationsAuditEvent({
        userId: input.userId,
        action: INTEGRATIONS_AUDIT_ACTIONS.TOKEN_REFRESHED,
        resourceId: input.integrationId,
        metadata: { slug: input.slug },
        context: {
          ipAddress: "0.0.0.0",
          userAgent: "token-manager",
        },
      });
      return refreshed.access_token;
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Token refresh failed";
      await integrationsRepository.createLog({
        integrationId: input.integrationId,
        level: "ERROR",
        action: "token_refresh_failed",
        message: reason.slice(0, 1000),
        metadata: { phase: "19.2" },
        userId: input.userId,
      });
      await retryManager.recordAttempt({
        integrationId: input.integrationId,
        userId: input.userId,
        success: false,
        reason,
        kind: "token_refresh",
        retryCount: 1,
      });
      throw new IntegrationsError(
        reason,
        401,
        INTEGRATIONS_ERROR_CODES.HEALTH_FAILED,
      );
    }
  }

  async test(
    provider: OAuthIntegrationProviderValue,
    actor: IntegrationsActor,
    context: IntegrationsRequestContext,
  ): Promise<IntegrationTestResponse> {
    await integrationsRepository.ensureCatalogSeeded();
    const slug = requireOAuthSlug(provider);
    requireProviderConfigured(slug);

    const existing = await integrationsRepository.findBySlug(slug);
    if (!existing) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_FOUND,
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }
    if (!existing.isConnected) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_CONNECTED,
        409,
        INTEGRATIONS_ERROR_CODES.CONFLICT,
      );
    }

    let healthy = false;
    let message = "";
    let healthStatus: "HEALTHY" | "DEGRADED" | "UNHEALTHY" = "UNHEALTHY";

    try {
      const accessToken = await this.ensureFreshAccessToken({
        integrationId: existing.id,
        slug,
        userId: actor.userId,
      });

      if (slug === "gmail") {
        try {
          await probeGmailConnection(accessToken);
          healthy = true;
          healthStatus = "HEALTHY";
          message = "Gmail profile probe succeeded.";
        } catch (gmailError) {
          const gmailMessage =
            gmailError instanceof Error
              ? gmailError.message
              : "Gmail profile probe failed";
          // OAuth identity works but Gmail API is disabled → connected but degraded.
          if (/Gmail API is not enabled/i.test(gmailMessage)) {
            healthy = true;
            healthStatus = "DEGRADED";
            message = gmailMessage;
          } else {
            throw gmailError;
          }
        }
      } else if (slug === "google_calendar") {
        await probeGoogleCalendarConnection(accessToken);
        healthy = true;
        healthStatus = "HEALTHY";
        message = "Google Calendar probe succeeded.";
      } else {
        await probeGitHubConnection(accessToken);
        healthy = true;
        healthStatus = "HEALTHY";
        message = "GitHub user probe succeeded.";
      }
    } catch (error) {
      healthy = false;
      healthStatus = "UNHEALTHY";
      message =
        error instanceof Error ? error.message : "Connection test failed";
      await retryManager.recordAttempt({
        integrationId: existing.id,
        userId: actor.userId,
        success: false,
        reason: message,
        kind: "health_test",
        retryCount: 1,
      });
    }

    const prev = asConfig(existing.config);
    const config = {
      ...prev,
      phase: "19.2",
      apiVersion: OAUTH_API_VERSIONS[slug],
      lastError: healthy ? null : message,
    };

    const updated = await integrationsRepository.updateConnection(existing.id, {
      healthStatus,
      healthMessage: message.slice(0, 500),
      lastHealthCheckAt: new Date(),
      lastSyncAt: new Date(),
      status: healthy ? "CONNECTED" : "ERROR",
      config: config as Prisma.InputJsonValue,
    });

    await syncManager.recordHealthProbe({
      integrationId: existing.id,
      userId: actor.userId,
      healthy,
    });

    await integrationsRepository.createLog({
      integrationId: existing.id,
      level: healthy ? "INFO" : "ERROR",
      action: "health_check",
      message: message.slice(0, 1000),
      metadata: { phase: "19.2", provider, healthy },
      userId: actor.userId,
    });

    await logIntegrationsAuditEvent({
      userId: actor.userId,
      action: INTEGRATIONS_AUDIT_ACTIONS.TESTED,
      resourceId: existing.id,
      metadata: { provider, healthy, healthStatus },
      context,
    });

    const successRate = await computeSuccessRate(existing.id);
    return {
      message: healthy
        ? INTEGRATIONS_MESSAGES.TEST_OK
        : INTEGRATIONS_MESSAGES.TEST_FAIL,
      healthy,
      healthStatus,
      integration: mapIntegrationDto(updated, { successRate }),
    };
  }

  async status(
    provider: OAuthIntegrationProviderValue,
  ): Promise<IntegrationProviderStatusDto> {
    await integrationsRepository.ensureCatalogSeeded();
    const slug = requireOAuthSlug(provider);
    const row = await integrationsRepository.findBySlug(slug);
    if (!row) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_FOUND,
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }

    const config = asConfig(row.config);
    const successRate = await computeSuccessRate(row.id);
    const bundle = row.isConnected
      ? await tokenManager.readBundle(row.id)
      : null;

    return {
      provider,
      slug: row.slug,
      name: row.name,
      isConnected: row.isConnected,
      status: row.status,
      healthStatus: row.healthStatus,
      healthMessage: row.healthMessage,
      lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
      lastHealthCheckAt: row.lastHealthCheckAt?.toISOString() ?? null,
      lastError:
        typeof config.lastError === "string" ? config.lastError : null,
      apiVersion:
        typeof config.apiVersion === "string"
          ? config.apiVersion
          : OAUTH_API_VERSIONS[slug],
      successRate,
      tokenExpiresAt:
        bundle?.expiresAt?.toISOString() ??
        (typeof config.tokenExpiresAt === "string"
          ? config.tokenExpiresAt
          : null),
      accountLabel:
        typeof config.accountLabel === "string" ? config.accountLabel : null,
      scopes: Array.isArray(config.scopes)
        ? config.scopes.filter((s): s is string => typeof s === "string")
        : [],
      webhookReady: Boolean(config.webhookReady),
      syncStatus: row.isConnected ? "idle" : null,
    };
  }
}

export const oauthProviderService = new OAuthProviderService();

export { isOAuthSlug };
