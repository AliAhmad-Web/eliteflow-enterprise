import {
  type ConnectIntegrationInput,
  type DisconnectIntegrationInput,
  type IntegrationDetailDto,
  type IntegrationOverviewDto,
  type ListIntegrationLogsQueryInput,
  type ListIntegrationsQueryInput,
  type ListSyncHistoryQueryInput,
  type TestIntegrationInput,
} from "@enterprise/shared";

import {
  INTEGRATIONS_MESSAGES,
} from "./integrations.constants.js";
import {
  INTEGRATIONS_ERROR_CODES,
  IntegrationsError,
} from "./integrations.errors.js";
import {
  mapIntegrationDetailDto,
  mapIntegrationDto,
  mapIntegrationLogDto,
} from "./integrations.mapper.js";
import { integrationsRepository } from "./integrations.repository.js";
import type {
  IntegrationsActor,
  IntegrationsRequestContext,
} from "./integrations.types.js";
import {
  assertVisible,
  canManageIntegrations,
  requireManage,
  requireRead,
} from "./integrations.access.js";
import { syncManager } from "./sync-manager.service.js";
import {
  apiKeyProviderService,
  isApiKeySlug,
} from "./api-keys/api-key-provider.service.js";
import {
  isOAuthSlug,
  oauthProviderService,
} from "./oauth/oauth-provider.service.js";
import { SLUG_TO_ROUTE_PROVIDER } from "./oauth/oauth-config.js";

function computeHealthScore(input: {
  total: number;
  healthy: number;
  connected: number;
}): number {
  if (input.total === 0) return 100;
  if (input.connected === 0) return 100;
  return Math.round((input.healthy / input.connected) * 100);
}

export class IntegrationService {
  async list(
    query: ListIntegrationsQueryInput,
    actor: IntegrationsActor,
  ): Promise<IntegrationOverviewDto> {
    requireRead(actor);
    await integrationsRepository.ensureCatalogSeeded();

    const canManage = canManageIntegrations(actor);
    const rows = await integrationsRepository.listIntegrations({
      search: query.search,
      status: query.status,
      healthStatus: query.healthStatus,
      connected:
        query.connected === undefined
          ? undefined
          : query.connected === "true",
      category: query.category,
      visibility: {
        role: String(actor.role),
        canManage,
      },
    });

    const ids = rows.map((row) => row.id);
    const outcomesById =
      await integrationsRepository.countSyncOutcomesByIntegrationIds(ids);
    const rateById = new Map(
      ids.map((id) => {
        const { success, failed } = outcomesById.get(id) ?? {
          success: 0,
          failed: 0,
        };
        const total = success + failed;
        return [
          id,
          total === 0 ? null : Math.round((success / total) * 100),
        ] as const;
      }),
    );

    const integrations = rows.map((row) =>
      mapIntegrationDto(row, { successRate: rateById.get(row.id) ?? null }),
    );
    const connectedCount = integrations.filter((item) => item.isConnected).length;
    const disconnectedCount = integrations.length - connectedCount;
    const healthyCount = integrations.filter(
      (item) => item.isConnected && item.healthStatus === "HEALTHY",
    ).length;
    const failedCount = integrations.filter(
      (item) =>
        item.healthStatus === "UNHEALTHY" || item.status === "ERROR",
    ).length;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const syncJobsToday = await integrationsRepository.countSyncJobsSince(
      startOfDay,
      ids.length > 0 ? ids : undefined,
    );
    const outcomes = await integrationsRepository.countSyncOutcomesGlobal(
      ids.length > 0 ? ids : undefined,
    );
    const outcomeTotal = outcomes.success + outcomes.failed;
    const successRate =
      outcomeTotal === 0
        ? 100
        : Math.round((outcomes.success / outcomeTotal) * 100);

    return {
      connectedCount,
      disconnectedCount,
      totalCount: integrations.length,
      healthyCount,
      failedCount,
      syncJobsToday,
      successRate,
      healthScore: computeHealthScore({
        total: integrations.length,
        healthy: healthyCount,
        connected: connectedCount,
      }),
      canManage,
      integrations,
    };
  }

  async getById(
    id: string,
    actor: IntegrationsActor,
  ): Promise<IntegrationDetailDto> {
    requireRead(actor);
    await integrationsRepository.ensureCatalogSeeded();

    const row = await integrationsRepository.findById(id);
    if (!row) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_FOUND,
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }
    assertVisible(actor, row);
    const { success, failed } =
      await integrationsRepository.countSyncOutcomes(row.id);
    const total = success + failed;
    const successRate =
      total === 0 ? null : Math.round((success / total) * 100);
    return mapIntegrationDetailDto(row, { successRate });
  }

  async getBySlug(
    slug: string,
    actor: IntegrationsActor,
  ): Promise<IntegrationDetailDto> {
    requireRead(actor);
    await integrationsRepository.ensureCatalogSeeded();

    const row = await integrationsRepository.findBySlug(slug);
    if (!row) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_FOUND,
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }
    assertVisible(actor, row);
    const detailed = await integrationsRepository.findById(row.id);
    if (!detailed) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_FOUND,
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }
    const { success, failed } =
      await integrationsRepository.countSyncOutcomes(row.id);
    const total = success + failed;
    const successRate =
      total === 0 ? null : Math.round((success / total) * 100);
    return mapIntegrationDetailDto(detailed, { successRate });
  }

  async connect(
    input: ConnectIntegrationInput,
    actor: IntegrationsActor,
    context: IntegrationsRequestContext,
  ) {
    requireManage(actor);
    await integrationsRepository.ensureCatalogSeeded();

    const existing = await integrationsRepository.findByIdOrSlug({
      id: input.integrationId,
      slug: input.slug,
    });
    if (!existing) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_FOUND,
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }

    if (isOAuthSlug(existing.slug)) {
      return oauthProviderService.startConnect(
        SLUG_TO_ROUTE_PROVIDER[existing.slug],
        actor,
        context,
      );
    }

    if (isApiKeySlug(existing.slug)) {
      return apiKeyProviderService.connect(
        existing.slug,
        { secret: input.secret, label: input.label },
        actor,
        context,
      );
    }

    throw new IntegrationsError(
      `Provider "${existing.slug}" is not available for connection in this phase.`,
      400,
      INTEGRATIONS_ERROR_CODES.VALIDATION,
    );
  }

  async disconnect(
    input: DisconnectIntegrationInput,
    actor: IntegrationsActor,
    context: IntegrationsRequestContext,
  ) {
    requireManage(actor);
    await integrationsRepository.ensureCatalogSeeded();

    const existing = await integrationsRepository.findByIdOrSlug({
      id: input.integrationId,
      slug: input.slug,
    });
    if (!existing) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_FOUND,
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }

    if (isOAuthSlug(existing.slug)) {
      return oauthProviderService.disconnect(
        SLUG_TO_ROUTE_PROVIDER[existing.slug],
        actor,
        context,
      );
    }

    if (isApiKeySlug(existing.slug)) {
      return apiKeyProviderService.disconnect(existing.slug, actor, context);
    }

    throw new IntegrationsError(
      `Provider "${existing.slug}" cannot be disconnected in this phase.`,
      400,
      INTEGRATIONS_ERROR_CODES.VALIDATION,
    );
  }

  async test(
    input: TestIntegrationInput,
    actor: IntegrationsActor,
    context: IntegrationsRequestContext,
  ) {
    requireManage(actor);
    await integrationsRepository.ensureCatalogSeeded();

    const existing = await integrationsRepository.findByIdOrSlug({
      id: input.integrationId,
      slug: input.slug,
    });
    if (!existing) {
      throw new IntegrationsError(
        INTEGRATIONS_MESSAGES.NOT_FOUND,
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }

    if (isOAuthSlug(existing.slug)) {
      return oauthProviderService.test(
        SLUG_TO_ROUTE_PROVIDER[existing.slug],
        actor,
        context,
      );
    }

    if (isApiKeySlug(existing.slug)) {
      return apiKeyProviderService.test(existing.slug, actor, context);
    }

    throw new IntegrationsError(
      `Provider "${existing.slug}" cannot be tested in this phase.`,
      400,
      INTEGRATIONS_ERROR_CODES.VALIDATION,
    );
  }

  async listLogs(
    query: ListIntegrationLogsQueryInput,
    actor: IntegrationsActor,
  ) {
    requireRead(actor);
    await integrationsRepository.ensureCatalogSeeded();

    const canManage = canManageIntegrations(actor);
    let allowedIntegrationIds: string[] | null = null;
    if (!canManage) {
      const visible = await integrationsRepository.listIntegrations({
        visibility: { role: String(actor.role), canManage: false },
      });
      allowedIntegrationIds = visible.map((row) => row.id);
      if (allowedIntegrationIds.length === 0) {
        return {
          items: [],
          pagination: {
            page: query.page,
            pageSize: query.pageSize,
            total: 0,
            totalPages: 1,
          },
        };
      }
      if (
        query.integrationId &&
        !allowedIntegrationIds.includes(query.integrationId)
      ) {
        throw new IntegrationsError(
          INTEGRATIONS_MESSAGES.VIEW_FORBIDDEN,
          403,
          INTEGRATIONS_ERROR_CODES.FORBIDDEN,
        );
      }
    }

    const { items, total } = await integrationsRepository.listLogs({
      page: query.page,
      pageSize: query.pageSize,
      integrationId: query.integrationId,
      level: query.level,
      search: query.search,
      allowedIntegrationIds,
    });

    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    return {
      items: items.map(mapIntegrationLogDto),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
      },
    };
  }

  async listHistory(
    query: ListSyncHistoryQueryInput,
    actor: IntegrationsActor,
  ) {
    requireRead(actor);
    await integrationsRepository.ensureCatalogSeeded();

    const canManage = canManageIntegrations(actor);
    let allowedIntegrationIds: string[] | null = null;
    if (!canManage) {
      const visible = await integrationsRepository.listIntegrations({
        visibility: { role: String(actor.role), canManage: false },
      });
      allowedIntegrationIds = visible.map((row) => row.id);
      if (allowedIntegrationIds.length === 0) {
        return {
          items: [],
          pagination: {
            page: query.page,
            pageSize: query.pageSize,
            total: 0,
            totalPages: 1,
          },
        };
      }
      if (
        query.integrationId &&
        !allowedIntegrationIds.includes(query.integrationId)
      ) {
        throw new IntegrationsError(
          INTEGRATIONS_MESSAGES.VIEW_FORBIDDEN,
          403,
          INTEGRATIONS_ERROR_CODES.FORBIDDEN,
        );
      }
    }

    const { items, total } = await syncManager.list({
      page: query.page,
      pageSize: query.pageSize,
      integrationId: query.integrationId,
      status: query.status,
      allowedIntegrationIds,
    });

    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
      },
    };
  }
}

export const integrationService = new IntegrationService();
