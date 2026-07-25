import {
  type Client,
  type ClientStatus,
  type Prisma,
  prisma,
} from "@enterprise/database";

import type {
  CreateClientInput,
  ListClientsQueryInput,
  UpdateClientInput,
} from "./clients.validation.js";

const SORT_FIELD_MAP = {
  companyName: "companyName",
  contactName: "contactName",
  email: "email",
  status: "status",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const satisfies Record<
  ListClientsQueryInput["sortBy"],
  keyof Prisma.ClientOrderByWithRelationInput
>;

function nullIfEmpty(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value.length === 0 ? null : value;
}

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
    if (input.notes !== undefined) {
      data.notes = nullIfEmpty(input.notes) ?? null;
    }

    return prisma.client.update({
      where: { id },
      data,
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
}

export const clientsRepository = new ClientsRepository();
