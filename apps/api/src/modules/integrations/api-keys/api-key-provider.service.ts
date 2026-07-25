import type { Prisma } from "@enterprise/database";
import type {
  IntegrationConnectResponse,
  IntegrationDisconnectResponse,
  IntegrationDto,
  IntegrationProviderStatusDto,
  IntegrationTestResponse,
} from "@enterprise/shared";

import { setAiProviderApiKey } from "../../ai/providers/ai-runtime-config.js";
import { setResendRuntimeApiKey } from "../../../integrations/email/email-runtime-config.js";
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
import { credentialManager } from "../credential-manager.service.js";
import { syncManager } from "../sync-manager.service.js";
import { webhookManager } from "../webhook-manager.service.js";
import {
  API_KEY_CREDENTIAL,
  API_VERSIONS,
  emptyUsageSnapshot,
  isApiKeySlug,
  type ApiKeySlug,
  type ApiUsageSnapshot,
} from "./api-key-config.js";
import { probeApiKeyProvider } from "./api-key-probes.js";
import {
  recordUsageLatency,
  readUsageFromConfig,
  writeUsageIntoConfig,
} from "./usage-metrics.js";

function asConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

async function computeSuccessRate(
  integrationId: string,
): Promise<number | null> {
  const { success, failed } =
    await integrationsRepository.countSyncOutcomes(integrationId);
  const total = success + failed;
  if (total === 0) return null;
  return Math.round((success / total) * 100);
}

function requireSecret(slug: ApiKeySlug, secret?: string): string {
  const trimmed = secret?.trim();
  if (slug === "supabase" && !trimmed) {
    // Prefer existing env stack when no vault secret is supplied.
    return "env";
  }
  if (!trimmed || trimmed.length < 8) {
    throw new IntegrationsError(
      secretHint(slug),
      400,
      INTEGRATIONS_ERROR_CODES.VALIDATION,
    );
  }
  return trimmed;
}

function secretHint(slug: ApiKeySlug): string {
  switch (slug) {
    case "gemini":
      return "Gemini API key is required (from Google AI Studio).";
    case "openai":
      return "OpenAI API key is required.";
    case "stripe":
      return "Stripe secret key is required (sk_…). Payments are not processed in Phase 19.3.";
    case "cloudinary":
      return "Cloudinary credentials required as cloud_name:api_key:api_secret.";
    case "resend":
      return "Resend API key is required.";
    case "supabase":
      return "Supabase credentials required as url|service_role_key, or configure SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.";
    default: {
      const _exhaustive: never = slug;
      return _exhaustive;
    }
  }
}

function syncRuntimeSecrets(slug: ApiKeySlug, plaintext: string | null): void {
  if (slug === "gemini" || slug === "openai") {
    setAiProviderApiKey(slug, plaintext);
  }
  if (slug === "resend") {
    setResendRuntimeApiKey(plaintext);
  }
}

/**
 * ApiKeyProviderService — Gemini, OpenAI (future), Stripe, Cloudinary, Resend, Supabase.
 * Encrypts credentials, probes live APIs, never returns secrets.
 */
export class ApiKeyProviderService {
  async connect(
    slug: ApiKeySlug,
    input: { secret?: string; label?: string },
    actor: IntegrationsActor,
    context: IntegrationsRequestContext,
  ): Promise<IntegrationConnectResponse> {
    await integrationsRepository.ensureCatalogSeeded();

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

    const secret = requireSecret(slug, input.secret);
    const probe = await probeApiKeyProvider(slug, secret);
    if (!probe.healthy) {
      await integrationsRepository.createLog({
        integrationId: integration.id,
        level: "ERROR",
        action: "connect_failed",
        message: probe.message,
        metadata: { phase: "19.3", slug },
        userId: actor.userId,
      });
      throw new IntegrationsError(
        probe.message,
        400,
        INTEGRATIONS_ERROR_CODES.VALIDATION,
      );
    }

    const vaultSecret = secret === "env" ? `env:${Date.now()}` : secret;
    await credentialManager.storeConnectionSecret({
      integrationId: integration.id,
      keyName: API_KEY_CREDENTIAL,
      plaintext: vaultSecret,
      userId: actor.userId,
    });

    if (secret !== "env") {
      syncRuntimeSecrets(slug, secret);
    }

    await webhookManager.ensureDefaultEndpoint({
      integrationId: integration.id,
      slug: integration.slug,
      userId: actor.userId,
    });

    const now = new Date();
    const usage = emptyUsageSnapshot();
    if (probe.latencyMs != null) {
      recordUsageLatency(usage, probe.latencyMs);
    }

    const config: Record<string, unknown> = {
      phase: "19.3",
      connectionMode: "api_key",
      apiVersion: API_VERSIONS[slug],
      accountLabel: probe.accountLabel ?? input.label ?? integration.name,
      lastError: null,
      label: input.label ?? integration.name,
      providerMeta: probe.metadata ?? {},
      usage,
      architecture:
        slug === "stripe"
          ? {
              products: true,
              subscriptions: true,
              checkout: true,
              paymentIntents: true,
              customerPortal: true,
              webhooks: true,
              paymentsEnabled: false,
            }
          : undefined,
    };

    const updated = await integrationsRepository.updateConnection(
      integration.id,
      {
        isConnected: true,
        status: "CONNECTED",
        healthStatus: "HEALTHY",
        healthMessage: probe.message,
        connectedAt: now,
        disconnectedAt: null,
        connectedBy: { connect: { id: actor.userId } },
        lastSyncAt: now,
        lastHealthCheckAt: now,
        config: config as Prisma.InputJsonValue,
      },
    );

    await syncManager.recordConnectSync({
      integrationId: integration.id,
      userId: actor.userId,
    });

    await integrationsRepository.createLog({
      integrationId: integration.id,
      level: "INFO",
      action: "connect",
      message: `${integration.name} connected via API key.`,
      metadata: { phase: "19.3", slug, latencyMs: probe.latencyMs },
      userId: actor.userId,
    });

    await logIntegrationsAuditEvent({
      userId: actor.userId,
      action: INTEGRATIONS_AUDIT_ACTIONS.CONNECTED,
      resourceId: integration.id,
      metadata: { slug, mode: "api_key", phase: "19.3" },
      context,
    });

    return {
      message: INTEGRATIONS_MESSAGES.CONNECTED,
      integration: mapIntegrationDto(updated, {
        successRate: await computeSuccessRate(integration.id),
      }),
    };
  }

  async disconnect(
    slug: ApiKeySlug,
    actor: IntegrationsActor,
    context: IntegrationsRequestContext,
  ): Promise<IntegrationDisconnectResponse> {
    await integrationsRepository.ensureCatalogSeeded();
    const integration = await integrationsRepository.findBySlug(slug);
    if (!integration) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_FOUND,
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }
    if (!integration.isConnected) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_CONNECTED,
        409,
        INTEGRATIONS_ERROR_CODES.CONFLICT,
      );
    }

    await credentialManager.revokeAll(integration.id, actor.userId);
    await webhookManager.deactivateAll(integration.id);
    syncRuntimeSecrets(slug, null);

    const now = new Date();
    const updated = await integrationsRepository.updateConnection(
      integration.id,
      {
        isConnected: false,
        status: "DISCONNECTED",
        healthStatus: "UNKNOWN",
        healthMessage: "Disconnected by administrator.",
        disconnectedAt: now,
        connectedBy: { disconnect: true },
        config: {
          phase: "19.3",
          connectionMode: "disconnected",
          apiVersion: API_VERSIONS[slug],
          lastError: null,
        } as Prisma.InputJsonValue,
      },
    );

    await integrationsRepository.createLog({
      integrationId: integration.id,
      level: "WARNING",
      action: "disconnect",
      message: `${integration.name} disconnected. Credentials revoked.`,
      metadata: { phase: "19.3", slug },
      userId: actor.userId,
    });

    await logIntegrationsAuditEvent({
      userId: actor.userId,
      action: INTEGRATIONS_AUDIT_ACTIONS.DISCONNECTED,
      resourceId: integration.id,
      metadata: { slug, phase: "19.3" },
      context,
    });

    return {
      message: INTEGRATIONS_MESSAGES.DISCONNECTED,
      integration: mapIntegrationDto(updated),
    };
  }

  async test(
    slug: ApiKeySlug,
    actor: IntegrationsActor,
    context: IntegrationsRequestContext,
  ): Promise<IntegrationTestResponse> {
    await integrationsRepository.ensureCatalogSeeded();
    const integration = await integrationsRepository.findBySlug(slug);
    if (!integration) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_FOUND,
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }
    if (!integration.isConnected) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_CONNECTED,
        409,
        INTEGRATIONS_ERROR_CODES.CONFLICT,
      );
    }

    let secret =
      (await credentialManager.decryptActive(
        integration.id,
        API_KEY_CREDENTIAL,
      )) ?? (await credentialManager.decryptActive(integration.id));

    if (!secret || secret.startsWith("env:")) {
      secret = "env";
    }

    const probe = await probeApiKeyProvider(slug, secret);
    const config = asConfig(integration.config);
    const usage = readUsageFromConfig(config);
    if (probe.latencyMs != null) {
      recordUsageLatency(usage, probe.latencyMs);
    }
    writeUsageIntoConfig(config, usage);

    if (probe.healthy) {
      config.lastError = null;
      config.accountLabel = probe.accountLabel ?? config.accountLabel;
      config.apiVersion = API_VERSIONS[slug];
      if (secret !== "env") {
        syncRuntimeSecrets(slug, secret);
      }
    } else {
      config.lastError = probe.message;
    }

    const updated = await integrationsRepository.updateConnection(
      integration.id,
      {
        healthStatus: probe.healthy ? "HEALTHY" : "UNHEALTHY",
        healthMessage: probe.message,
        lastHealthCheckAt: new Date(),
        lastSyncAt: new Date(),
        status: probe.healthy ? "CONNECTED" : "ERROR",
        config: config as Prisma.InputJsonValue,
      },
    );

    await syncManager.recordHealthProbe({
      integrationId: integration.id,
      userId: actor.userId,
      healthy: probe.healthy,
    });

    await integrationsRepository.createLog({
      integrationId: integration.id,
      level: probe.healthy ? "INFO" : "ERROR",
      action: "health_check",
      message: probe.message,
      metadata: {
        phase: "19.3",
        slug,
        healthy: probe.healthy,
        latencyMs: probe.latencyMs,
      },
      userId: actor.userId,
    });

    await logIntegrationsAuditEvent({
      userId: actor.userId,
      action: INTEGRATIONS_AUDIT_ACTIONS.TESTED,
      resourceId: integration.id,
      metadata: {
        slug,
        healthy: probe.healthy,
        phase: "19.3",
      },
      context,
    });

    return {
      message: probe.healthy
        ? INTEGRATIONS_MESSAGES.TEST_OK
        : INTEGRATIONS_MESSAGES.TEST_FAIL,
      healthy: probe.healthy,
      healthStatus: probe.healthy ? "HEALTHY" : "UNHEALTHY",
      integration: mapIntegrationDto(updated, {
        successRate: await computeSuccessRate(integration.id),
      }),
    };
  }

  async status(slug: ApiKeySlug): Promise<IntegrationProviderStatusDto> {
    await integrationsRepository.ensureCatalogSeeded();
    const integration = await integrationsRepository.findBySlug(slug);
    if (!integration) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_FOUND,
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }
    const config = asConfig(integration.config);
    const successRate = await computeSuccessRate(integration.id);
    const dto = mapIntegrationDto(integration, { successRate });

    return {
      provider: slug,
      slug: integration.slug,
      name: integration.name,
      isConnected: integration.isConnected,
      status: dto.status,
      healthStatus: dto.healthStatus,
      healthMessage: integration.healthMessage,
      lastSyncAt: dto.lastSyncAt,
      lastHealthCheckAt: dto.lastHealthCheckAt,
      lastError: dto.lastError,
      apiVersion: dto.apiVersion ?? API_VERSIONS[slug],
      successRate,
      tokenExpiresAt: null,
      accountLabel: dto.accountLabel,
      scopes: [],
      webhookReady: (integration._count?.webhooks ?? 0) > 0,
      syncStatus: integration.isConnected ? "idle" : null,
    };
  }

  async getDecryptedApiKey(slug: ApiKeySlug): Promise<string | null> {
    const integration = await integrationsRepository.findBySlug(slug);
    if (!integration?.isConnected) return null;
    const secret =
      (await credentialManager.decryptActive(
        integration.id,
        API_KEY_CREDENTIAL,
      )) ?? (await credentialManager.decryptActive(integration.id));
    if (!secret || secret.startsWith("env:")) return null;
    return secret;
  }

  async recordAiRequest(slug: "gemini" | "openai", latencyMs: number) {
    const integration = await integrationsRepository.findBySlug(slug);
    if (!integration?.isConnected) return;
    const config = asConfig(integration.config);
    const usage = readUsageFromConfig(config);
    recordUsageLatency(usage, latencyMs);
    writeUsageIntoConfig(config, usage);
    await integrationsRepository.updateConnection(integration.id, {
      config: config as Prisma.InputJsonValue,
      lastSyncAt: new Date(),
    });
    await integrationsRepository.createLog({
      integrationId: integration.id,
      level: "INFO",
      action: "ai_request",
      message: `AI request completed via ${slug}.`,
      metadata: { phase: "19.3", latencyMs },
      userId: null,
    });
  }
}

export const apiKeyProviderService = new ApiKeyProviderService();

export { isApiKeySlug };
export type { ApiKeySlug, ApiUsageSnapshot, IntegrationDto };
