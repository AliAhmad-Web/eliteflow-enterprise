import {
  CLIENT_PIPELINE_STAGES,
  type ClientPipelineStageValue,
} from "@enterprise/shared";
import {
  type Client,
  type ClientActivity,
  type ClientActivityType,
  type ClientPipelineStage,
  type ClientStatus,
  ClientActivityType as ClientActivityTypeEnum,
  ClientPipelineStage as ClientPipelineStageEnum,
  ClientStatus as ClientStatusEnum,
  type Prisma,
  prisma,
} from "@enterprise/database";

import type {
  CreateClientActivityInput,
  CreateClientInput,
  ListClientActivitiesQueryInput,
  ListClientsQueryInput,
  UpdateClientInput,
} from "./clients.validation.js";

const SORT_FIELD_MAP = {
  companyName: "companyName",
  contactName: "contactName",
  email: "email",
  status: "status",
  pipelineStage: "pipelineStage",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const satisfies Record<
  ListClientsQueryInput["sortBy"],
  keyof Prisma.ClientOrderByWithRelationInput
>;

const PIPELINE_BOARD_LIMIT = 50;

export function defaultPipelineForStatus(
  status: ClientStatus,
): ClientPipelineStage {
  switch (status) {
    case ClientStatusEnum.ACTIVE:
      return ClientPipelineStageEnum.WON;
    case ClientStatusEnum.INACTIVE:
      return ClientPipelineStageEnum.LOST;
    default:
      return ClientPipelineStageEnum.NEW;
  }
}

export function statusForPipelineStage(stage: ClientPipelineStage): ClientStatus {
  switch (stage) {
    case ClientPipelineStageEnum.WON:
      return ClientStatusEnum.ACTIVE;
    case ClientPipelineStageEnum.LOST:
      return ClientStatusEnum.INACTIVE;
    default:
      return ClientStatusEnum.LEAD;
  }
}

function nullIfEmpty(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value.length === 0 ? null : value;
}

type ClientActivityWithCreator = ClientActivity & {
  createdBy?: { firstName: string; lastName: string } | null;
};

export class ClientsRepository {
  async findMany(query: ListClientsQueryInput): Promise<{
    items: Client[];
    total: number;
  }> {
    const where: Prisma.ClientWhereInput = {
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status as ClientStatus;
    }

    if (query.pipelineStage) {
      where.pipelineStage = query.pipelineStage as ClientPipelineStage;
    }

    if (query.search) {
      const term = query.search;
      where.OR = [
        { companyName: { contains: term, mode: "insensitive" } },
        { contactName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
        { city: { contains: term, mode: "insensitive" } },
        { country: { contains: term, mode: "insensitive" } },
      ];
    }

    const sortField = SORT_FIELD_MAP[query.sortBy];
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { [sortField]: query.sortOrder },
        skip,
        take: query.limit,
      }),
      prisma.client.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string): Promise<Client | null> {
    return prisma.client.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findActiveByEmail(
    email: string,
    excludeId?: string,
  ): Promise<Client | null> {
    return prisma.client.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  async create(
    input: CreateClientInput,
    createdById: string | null,
  ): Promise<Client> {
    const pipelineStage =
      input.pipelineStage ?? defaultPipelineForStatus(input.status as ClientStatus);

    return prisma.client.create({
      data: {
        companyName: input.companyName,
        contactName: input.contactName,
        email: input.email.toLowerCase(),
        phone: nullIfEmpty(input.phone) ?? null,
        website: nullIfEmpty(input.website) ?? null,
        addressLine1: nullIfEmpty(input.addressLine1) ?? null,
        city: nullIfEmpty(input.city) ?? null,
        country: nullIfEmpty(input.country) ?? null,
        status: input.status as ClientStatus,
        pipelineStage: pipelineStage as ClientPipelineStage,
        notes: nullIfEmpty(input.notes) ?? null,
        createdById,
      },
    });
  }

  async update(id: string, input: UpdateClientInput): Promise<Client> {
    const data: Prisma.ClientUpdateInput = {};

    if (input.companyName !== undefined) {
      data.companyName = input.companyName;
    }
    if (input.contactName !== undefined) {
      data.contactName = input.contactName;
    }
    if (input.email !== undefined) {
      data.email = input.email.toLowerCase();
    }
    if (input.phone !== undefined) {
      data.phone = nullIfEmpty(input.phone) ?? null;
    }
    if (input.website !== undefined) {
      data.website = nullIfEmpty(input.website) ?? null;
    }
    if (input.addressLine1 !== undefined) {
      data.addressLine1 = nullIfEmpty(input.addressLine1) ?? null;
    }
    if (input.city !== undefined) {
      data.city = nullIfEmpty(input.city) ?? null;
    }
    if (input.country !== undefined) {
      data.country = nullIfEmpty(input.country) ?? null;
    }
    if (input.status !== undefined) {
      data.status = input.status as ClientStatus;
    }
    if (input.pipelineStage !== undefined) {
      data.pipelineStage = input.pipelineStage as ClientPipelineStage;
    } else if (input.status !== undefined) {
      data.pipelineStage = defaultPipelineForStatus(input.status as ClientStatus);
    }
    if (input.notes !== undefined) {
      data.notes = nullIfEmpty(input.notes) ?? null;
    }

    return prisma.client.update({
      where: { id },
      data,
    });
  }

  async updatePipelineStage(
    id: string,
    pipelineStage: ClientPipelineStage,
    status: ClientStatus,
  ): Promise<Client> {
    return prisma.client.update({
      where: { id },
      data: { pipelineStage, status },
    });
  }

  async softDelete(id: string): Promise<Client> {
    return prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async countActive(): Promise<number> {
    return prisma.client.count({ where: { deletedAt: null } });
  }

  async countByStatus(status: ClientStatus): Promise<number> {
    return prisma.client.count({
      where: { deletedAt: null, status },
    });
  }

  async findPipelineBoard(): Promise<{
    columns: Array<{
      stage: ClientPipelineStageValue;
      count: number;
      clients: Client[];
    }>;
    total: number;
  }> {
    // Single query — avoid N parallel pool connections (Supabase session pool is small).
    const clients = await prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });

    const byStage = new Map<ClientPipelineStageValue, Client[]>();
    for (const stage of CLIENT_PIPELINE_STAGES) {
      byStage.set(stage, []);
    }

    for (const client of clients) {
      const stage = client.pipelineStage as ClientPipelineStageValue | null;
      if (!stage || !byStage.has(stage)) continue;
      byStage.get(stage)!.push(client);
    }

    const columns = CLIENT_PIPELINE_STAGES.map((stage) => {
      const all = byStage.get(stage) ?? [];
      return {
        stage,
        count: all.length,
        clients: all.slice(0, PIPELINE_BOARD_LIMIT),
      };
    });

    return { columns, total: clients.length };
  }

  async listActivities(
    clientId: string,
    query: ListClientActivitiesQueryInput,
  ): Promise<{ items: ClientActivityWithCreator[]; total: number }> {
    const where: Prisma.ClientActivityWhereInput = {
      clientId,
      deletedAt: null,
    };
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      prisma.clientActivity.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        skip,
        take: query.limit,
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.clientActivity.count({ where }),
    ]);

    return { items, total };
  }

  async createActivity(
    clientId: string,
    input: {
      type: ClientActivityType;
      title: string;
      body?: string | null;
      occurredAt?: Date;
      createdById: string | null;
    },
  ): Promise<ClientActivityWithCreator> {
    return prisma.clientActivity.create({
      data: {
        clientId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        occurredAt: input.occurredAt ?? new Date(),
        createdById: input.createdById,
      },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async findActivityById(
    clientId: string,
    activityId: string,
  ): Promise<ClientActivityWithCreator | null> {
    return prisma.clientActivity.findFirst({
      where: { id: activityId, clientId, deletedAt: null },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async softDeleteActivity(activityId: string): Promise<ClientActivity> {
    return prisma.clientActivity.update({
      where: { id: activityId },
      data: { deletedAt: new Date() },
    });
  }

  async findPortalUsersByClientId(clientId: string) {
    return prisma.user.findMany({
      where: {
        companyId: clientId,
        deletedAt: null,
        role: { code: "CLIENT" },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        companyId: true,
        createdAt: true,
        company: { select: { companyName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findUnlinkedPortalUsers(query: {
    search: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      companyId: null,
      role: { code: "CLIENT" },
    };

    if (query.search) {
      const term = query.search;
      where.OR = [
        { email: { contains: term, mode: "insensitive" } },
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          companyId: true,
          createdAt: true,
          company: { select: { companyName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: query.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  async findPortalUserCandidate(userId: string) {
    return prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        companyId: true,
        createdAt: true,
        role: { select: { code: true } },
        company: { select: { id: true, companyName: true } },
      },
    });
  }

  async setUserCompanyId(userId: string, companyId: string | null) {
    return prisma.user.update({
      where: { id: userId },
      data: { companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        companyId: true,
        createdAt: true,
        company: { select: { companyName: true } },
      },
    });
  }
}

export const clientsRepository = new ClientsRepository();

export { ClientActivityTypeEnum };
