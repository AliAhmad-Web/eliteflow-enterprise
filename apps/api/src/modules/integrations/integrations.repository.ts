import {
  prisma,
  Prisma,
  type Integration,
  type IntegrationConnectionStatus,
  type IntegrationHealthStatus,
  type IntegrationLogLevel,
  type IntegrationProvider,
  type IntegrationSyncStatus,
} from "@enterprise/database";

import { INTEGRATION_CATALOG } from "./integrations.constants.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

const credentialCountSelect = {
  _count: {
    select: {
      credentials: { where: { deletedAt: null, isActive: true } },
      webhooks: { where: { deletedAt: null } },
    },
  },
} as const;

export class IntegrationsRepository {
  async ensureCatalogSeeded(): Promise<void> {
    const existing = await prisma.integration.findMany({
      where: { deletedAt: null },
      select: { slug: true },
    });
    const existingSlugs = new Set(existing.map((row) => row.slug));
    const missing = INTEGRATION_CATALOG.filter(
      (item) => !existingSlugs.has(item.slug),
    );
    if (missing.length === 0) return;

    await prisma.$transaction(
      missing.map((item) =>
        prisma.integration.create({
          data: {
            slug: item.slug,
            name: item.name,
            description: item.description,
            provider: item.provider as IntegrationProvider,
            category: item.category,
            logoKey: item.logoKey,
            sortOrder: item.sortOrder,
            visibleToEmployee: item.visibleToEmployee,
            visibleToClient: item.visibleToClient,
          },
        }),
      ),
    );
  }

  async listIntegrations(filters: {
    search?: string;
    status?: IntegrationConnectionStatus;
    healthStatus?: IntegrationHealthStatus;
    connected?: boolean;
    category?: string;
    visibility: {
      role: string;
      canManage: boolean;
    };
  }): Promise<
    Array<
      Integration & {
        _count: { credentials: number; webhooks: number };
      }
    >
  > {
    const where: Prisma.IntegrationWhereInput = {
      deletedAt: null,
    };

    if (!filters.visibility.canManage) {
      if (filters.visibility.role === "CLIENT") {
        where.visibleToClient = true;
      } else if (filters.visibility.role === "EMPLOYEE") {
        where.visibleToEmployee = true;
      }
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { slug: { contains: filters.search, mode: "insensitive" } },
        { category: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.status) where.status = filters.status;
    if (filters.healthStatus) where.healthStatus = filters.healthStatus;
    if (filters.connected !== undefined) where.isConnected = filters.connected;
    if (filters.category) {
      where.category = { equals: filters.category, mode: "insensitive" };
    }

    return prisma.integration.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: credentialCountSelect,
    });
  }

  async findById(id: string) {
    if (!isUuid(id)) return null;
    return prisma.integration.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...credentialCountSelect,
        logs: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { integration: { select: { name: true } } },
        },
        syncHistory: {
          orderBy: { startedAt: "desc" },
          take: 10,
          include: { integration: { select: { name: true } } },
        },
        webhooks: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return prisma.integration.findFirst({
      where: { slug, deletedAt: null },
      include: credentialCountSelect,
    });
  }

  /**
   * Resolve by UUID or slug without querying UUID columns with non-UUID values
   * (Postgres/Prisma throw P2023 instead of returning null).
   */
  async resolveByIdOrSlug(idOrSlug: string) {
    if (isUuid(idOrSlug)) {
      return this.findById(idOrSlug);
    }
    return this.findBySlug(idOrSlug);
  }

  async findByIdOrSlug(input: { id?: string; slug?: string }) {
    if (input.id) {
      if (!isUuid(input.id)) return null;
      return prisma.integration.findFirst({
        where: { id: input.id, deletedAt: null },
        include: credentialCountSelect,
      });
    }
    if (input.slug) {
      return this.findBySlug(input.slug);
    }
    return null;
  }

  async updateConnection(
    id: string,
    data: Prisma.IntegrationUpdateInput,
  ): Promise<
    Integration & { _count: { credentials: number; webhooks: number } }
  > {
    return prisma.integration.update({
      where: { id },
      data,
      include: credentialCountSelect,
    });
  }

  async createLog(input: {
    integrationId: string;
    level?: IntegrationLogLevel;
    action: string;
    message: string;
    metadata?: Record<string, unknown>;
    userId?: string | null;
  }) {
    return prisma.integrationLog.create({
      data: {
        integrationId: input.integrationId,
        level: input.level ?? "INFO",
        action: input.action,
        message: input.message,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
        userId: input.userId ?? null,
      },
      include: { integration: { select: { name: true } } },
    });
  }

  async listLogs(input: {
    page: number;
    pageSize: number;
    integrationId?: string;
    level?: IntegrationLogLevel;
    search?: string;
    allowedIntegrationIds?: string[] | null;
  }) {
    const where: Prisma.IntegrationLogWhereInput = {};
    if (input.integrationId) where.integrationId = input.integrationId;
    if (input.level) where.level = input.level;
    if (input.search) {
      where.OR = [
        { message: { contains: input.search, mode: "insensitive" } },
        { action: { contains: input.search, mode: "insensitive" } },
      ];
    }
    if (input.allowedIntegrationIds) {
      if (input.integrationId) {
        where.integrationId = input.integrationId;
      } else {
        where.integrationId = { in: input.allowedIntegrationIds };
      }
    }

    const skip = (input.page - 1) * input.pageSize;
    const [items, total] = await Promise.all([
      prisma.integrationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: input.pageSize,
        include: { integration: { select: { name: true } } },
      }),
      prisma.integrationLog.count({ where }),
    ]);

    return { items, total };
  }

  async listSyncHistory(input: {
    page: number;
    pageSize: number;
    integrationId?: string;
    status?: IntegrationSyncStatus;
    allowedIntegrationIds?: string[] | null;
  }) {
    const where: Prisma.SyncHistoryWhereInput = {};
    if (input.integrationId) where.integrationId = input.integrationId;
    if (input.status) where.status = input.status;
    if (input.allowedIntegrationIds) {
      if (input.integrationId) {
        where.integrationId = input.integrationId;
      } else {
        where.integrationId = { in: input.allowedIntegrationIds };
      }
    }

    const skip = (input.page - 1) * input.pageSize;
    const [items, total] = await Promise.all([
      prisma.syncHistory.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip,
        take: input.pageSize,
        include: { integration: { select: { name: true } } },
      }),
      prisma.syncHistory.count({ where }),
    ]);

    return { items, total };
  }

  async createSyncHistory(input: {
    integrationId: string;
    status?: IntegrationSyncStatus;
    direction?: string;
    recordsProcessed?: number;
    recordsFailed?: number;
    message?: string;
    metadata?: Record<string, unknown>;
    retryCount?: number;
    failureReason?: string | null;
    lastRetryAt?: Date | null;
    triggeredById?: string | null;
    startedAt?: Date;
    completedAt?: Date | null;
  }) {
    return prisma.syncHistory.create({
      data: {
        integrationId: input.integrationId,
        status: input.status ?? "PENDING",
        direction: input.direction ?? "inbound",
        recordsProcessed: input.recordsProcessed ?? 0,
        recordsFailed: input.recordsFailed ?? 0,
        message: input.message,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
        retryCount: input.retryCount ?? 0,
        failureReason: input.failureReason ?? null,
        lastRetryAt: input.lastRetryAt ?? null,
        triggeredById: input.triggeredById ?? null,
        startedAt: input.startedAt ?? new Date(),
        completedAt: input.completedAt ?? null,
      },
      include: { integration: { select: { name: true } } },
    });
  }

  async countSyncJobsSince(since: Date, integrationIds?: string[]) {
    return prisma.syncHistory.count({
      where: {
        startedAt: { gte: since },
        ...(integrationIds ? { integrationId: { in: integrationIds } } : {}),
      },
    });
  }

  async countSyncOutcomes(integrationId: string) {
    const [success, failed] = await Promise.all([
      prisma.syncHistory.count({
        where: { integrationId, status: "SUCCESS" },
      }),
      prisma.syncHistory.count({
        where: { integrationId, status: "FAILED" },
      }),
    ]);
    return { success, failed };
  }

  /**
   * Batch success/failed sync counts for many integrations in one query
   * (avoids N+1 load that saturates remote DB on the integrations list).
   */
  async countSyncOutcomesByIntegrationIds(
    integrationIds: string[],
  ): Promise<Map<string, { success: number; failed: number }>> {
    const result = new Map<string, { success: number; failed: number }>();
    for (const id of integrationIds) {
      result.set(id, { success: 0, failed: 0 });
    }
    if (integrationIds.length === 0) {
      return result;
    }

    const rows = await prisma.syncHistory.groupBy({
      by: ["integrationId", "status"],
      where: {
        integrationId: { in: integrationIds },
        status: { in: ["SUCCESS", "FAILED"] },
      },
      _count: { _all: true },
    });

    for (const row of rows) {
      const current = result.get(row.integrationId) ?? {
        success: 0,
        failed: 0,
      };
      if (row.status === "SUCCESS") {
        current.success = row._count._all;
      } else if (row.status === "FAILED") {
        current.failed = row._count._all;
      }
      result.set(row.integrationId, current);
    }

    return result;
  }

  async countSyncOutcomesGlobal(integrationIds?: string[]) {
    const whereBase = integrationIds
      ? { integrationId: { in: integrationIds } }
      : {};
    const [success, failed] = await Promise.all([
      prisma.syncHistory.count({
        where: { ...whereBase, status: "SUCCESS" },
      }),
      prisma.syncHistory.count({
        where: { ...whereBase, status: "FAILED" },
      }),
    ]);
    return { success, failed };
  }

  async updateSyncHistory(
    id: string,
    data: Prisma.SyncHistoryUpdateInput,
  ) {
    return prisma.syncHistory.update({
      where: { id },
      data,
      include: { integration: { select: { name: true } } },
    });
  }

  async findSyncById(id: string) {
    return prisma.syncHistory.findFirst({
      where: { id },
      include: { integration: { select: { name: true, slug: true } } },
    });
  }

  async countSyncByStatus(input: {
    integrationId?: string;
    status?: IntegrationSyncStatus | IntegrationSyncStatus[];
    allowedIntegrationIds?: string[] | null;
  }) {
    const where: Prisma.SyncHistoryWhereInput = {};
    if (input.integrationId) where.integrationId = input.integrationId;
    if (input.allowedIntegrationIds) {
      where.integrationId = input.integrationId
        ? input.integrationId
        : { in: input.allowedIntegrationIds };
    }
    if (input.status) {
      where.status = Array.isArray(input.status)
        ? { in: input.status }
        : input.status;
    }
    return prisma.syncHistory.count({ where });
  }

  async findLatestSync(input: {
    integrationId: string;
    status?: IntegrationSyncStatus | IntegrationSyncStatus[];
  }) {
    return prisma.syncHistory.findFirst({
      where: {
        integrationId: input.integrationId,
        ...(input.status
          ? {
              status: Array.isArray(input.status)
                ? { in: input.status }
                : input.status,
            }
          : {}),
      },
      orderBy: { startedAt: "desc" },
    });
  }

  async listAlertLogs(input: {
    page: number;
    pageSize: number;
    integrationId?: string;
    acknowledged?: boolean;
    alertType?: string;
    allowedIntegrationIds?: string[] | null;
  }) {
    const where: Prisma.IntegrationLogWhereInput = {
      action: { startsWith: "alert." },
    };
    if (input.integrationId) where.integrationId = input.integrationId;
    if (input.allowedIntegrationIds) {
      where.integrationId = input.integrationId
        ? input.integrationId
        : { in: input.allowedIntegrationIds };
    }
    if (input.alertType) {
      where.action = `alert.${input.alertType}`;
    }

    const rows = await prisma.integrationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        integration: { select: { name: true, slug: true } },
      },
    });

    const filtered =
      input.acknowledged === undefined
        ? rows
        : rows.filter((row) => {
            const meta =
              row.metadata &&
              typeof row.metadata === "object" &&
              !Array.isArray(row.metadata)
                ? (row.metadata as Record<string, unknown>)
                : {};
            const acknowledged = meta.acknowledged === true;
            return input.acknowledged ? acknowledged : !acknowledged;
          });

    const total = filtered.length;
    const skip = (input.page - 1) * input.pageSize;
    const items = filtered.slice(skip, skip + input.pageSize);
    return { items, total };
  }

  async findLogById(id: string) {
    return prisma.integrationLog.findFirst({
      where: { id },
      include: { integration: { select: { name: true, slug: true } } },
    });
  }

  async updateLogMetadata(
    id: string,
    metadata: Record<string, unknown>,
  ) {
    return prisma.integrationLog.update({
      where: { id },
      data: { metadata: metadata as Prisma.InputJsonValue },
      include: { integration: { select: { name: true, slug: true } } },
    });
  }

  async listAllWebhooks(allowedIntegrationIds?: string[] | null) {
    return prisma.webhookEndpoint.findMany({
      where: {
        deletedAt: null,
        ...(allowedIntegrationIds
          ? { integrationId: { in: allowedIntegrationIds } }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: { integration: { select: { name: true, slug: true } } },
    });
  }

  async updateWebhookDelivery(
    id: string,
    data: {
      lastReceivedAt?: Date;
      lastDeliveryStatus?: string;
      isActive?: boolean;
    },
  ) {
    return prisma.webhookEndpoint.update({
      where: { id },
      data,
    });
  }

  async countHealthyProbes(integrationId: string, since: Date) {
    const [healthy, total] = await Promise.all([
      prisma.syncHistory.count({
        where: {
          integrationId,
          startedAt: { gte: since },
          direction: "probe",
          status: "SUCCESS",
        },
      }),
      prisma.syncHistory.count({
        where: {
          integrationId,
          startedAt: { gte: since },
          direction: "probe",
        },
      }),
    ]);
    return { healthy, total };
  }

  async upsertCredential(input: {
    integrationId: string;
    keyName: string;
    encryptedSecret: string;
    iv: string;
    authTag: string;
    secretLast4: string;
    createdById: string;
    expiresAt?: Date | null;
  }) {
    return prisma.credential.upsert({
      where: {
        integrationId_keyName: {
          integrationId: input.integrationId,
          keyName: input.keyName,
        },
      },
      create: {
        integrationId: input.integrationId,
        keyName: input.keyName,
        encryptedSecret: input.encryptedSecret,
        iv: input.iv,
        authTag: input.authTag,
        secretLast4: input.secretLast4,
        createdById: input.createdById,
        expiresAt: input.expiresAt ?? null,
        isActive: true,
      },
      update: {
        encryptedSecret: input.encryptedSecret,
        iv: input.iv,
        authTag: input.authTag,
        secretLast4: input.secretLast4,
        updatedById: input.createdById,
        expiresAt: input.expiresAt ?? null,
        isActive: true,
        deletedAt: null,
      },
    });
  }

  async softDeleteCredentials(integrationId: string, updatedById: string) {
    return prisma.credential.updateMany({
      where: { integrationId, deletedAt: null },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById,
      },
    });
  }

  async findActiveCredentials(integrationId: string) {
    return prisma.credential.findMany({
      where: {
        integrationId,
        deletedAt: null,
        isActive: true,
      },
    });
  }

  async createWebhook(input: {
    integrationId: string;
    url: string;
    events: string[];
    encryptedSecret?: string | null;
    iv?: string | null;
    authTag?: string | null;
    createdById: string;
  }) {
    return prisma.webhookEndpoint.create({
      data: {
        integrationId: input.integrationId,
        url: input.url,
        events: input.events,
        encryptedSecret: input.encryptedSecret ?? null,
        iv: input.iv ?? null,
        authTag: input.authTag ?? null,
        createdById: input.createdById,
        isActive: true,
      },
    });
  }

  async listWebhooks(integrationId: string) {
    return prisma.webhookEndpoint.findMany({
      where: { integrationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async deactivateWebhooks(integrationId: string) {
    return prisma.webhookEndpoint.updateMany({
      where: { integrationId, deletedAt: null, isActive: true },
      data: { isActive: false },
    });
  }
}

export const integrationsRepository = new IntegrationsRepository();
