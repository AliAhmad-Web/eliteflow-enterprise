import { ClientStatus, prisma } from "@enterprise/database";
import type {
  ClientDto,
  ClientListResponse,
  CreateClientInput,
  LinkPortalUserInput,
  ListClientsQueryInput,
  ListUnlinkedPortalUsersQueryInput,
  PortalUserDto,
  UpdateClientInput,
} from "@enterprise/shared";

import {
  CLIENTS_AUDIT_ACTIONS,
  logClientsAuditEvent,
} from "./clients.audit.js";
import { CLIENTS_ERROR_CODES, ClientsError } from "./clients.errors.js";
import { clientsRepository } from "./clients.repository.js";
import { toClientDto } from "./clients.types.js";

export type ClientsActor = {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function toPortalUserDto(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  companyId: string | null;
  createdAt: Date;
  company?: { companyName: string } | null;
}): PortalUserDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    companyId: user.companyId,
    companyName: user.company?.companyName ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export class ClientsService {
  async list(query: ListClientsQueryInput): Promise<ClientListResponse> {
    const { items, total } = await clientsRepository.findMany(query);
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    return {
      items: items.map(toClientDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getById(id: string): Promise<ClientDto> {
    const client = await clientsRepository.findById(id);
    if (!client) {
      throw new ClientsError(
        "Client not found",
        404,
        CLIENTS_ERROR_CODES.NOT_FOUND,
      );
    }

    return toClientDto(client);
  }

  async create(
    input: CreateClientInput,
    createdById: string | null,
    actor?: ClientsActor | null,
  ): Promise<ClientDto> {
    const existing = await clientsRepository.findActiveByEmail(input.email);
    if (existing) {
      throw new ClientsError(
        "A client with this email already exists",
        409,
        CLIENTS_ERROR_CODES.EMAIL_EXISTS,
        [{ field: "email", message: "A client with this email already exists" }],
      );
    }

    const created = await clientsRepository.create(input, createdById);

    await logClientsAuditEvent({
      userId: actor?.userId ?? createdById,
      action: CLIENTS_AUDIT_ACTIONS.CREATE,
      resourceId: created.id,
      metadata: { email: created.email, companyName: created.companyName },
      ipAddress: actor?.ipAddress,
      userAgent: actor?.userAgent,
    });

    return toClientDto(created);
  }

  async update(
    id: string,
    input: UpdateClientInput,
    actor?: ClientsActor | null,
  ): Promise<ClientDto> {
    const existing = await clientsRepository.findById(id);
    if (!existing) {
      throw new ClientsError(
        "Client not found",
        404,
        CLIENTS_ERROR_CODES.NOT_FOUND,
      );
    }

    if (input.email) {
      const duplicate = await clientsRepository.findActiveByEmail(
        input.email,
        id,
      );
      if (duplicate) {
        throw new ClientsError(
          "A client with this email already exists",
          409,
          CLIENTS_ERROR_CODES.EMAIL_EXISTS,
          [
            {
              field: "email",
              message: "A client with this email already exists",
            },
          ],
        );
      }
    }

    const updated = await clientsRepository.update(id, input);

    await logClientsAuditEvent({
      userId: actor?.userId,
      action: CLIENTS_AUDIT_ACTIONS.UPDATE,
      resourceId: id,
      metadata: { fields: Object.keys(input) },
      ipAddress: actor?.ipAddress,
      userAgent: actor?.userAgent,
    });

    return toClientDto(updated);
  }

  async remove(
    id: string,
    actor?: ClientsActor | null,
  ): Promise<{ id: string }> {
    const existing = await clientsRepository.findById(id);
    if (!existing) {
      throw new ClientsError(
        "Client not found",
        404,
        CLIENTS_ERROR_CODES.NOT_FOUND,
      );
    }

    await clientsRepository.softDelete(id);

    // Soft-deleted CRM companies must not keep portal access.
    await prisma.user.updateMany({
      where: { companyId: id, deletedAt: null },
      data: { companyId: null },
    });

    await logClientsAuditEvent({
      userId: actor?.userId,
      action: CLIENTS_AUDIT_ACTIONS.DELETE,
      resourceId: id,
      metadata: { companyName: existing.companyName, unlinkedPortalUsers: true },
      ipAddress: actor?.ipAddress,
      userAgent: actor?.userAgent,
    });

    return { id };
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    leads: number;
    inactive: number;
  }> {
    const [total, active, leads, inactive] = await Promise.all([
      clientsRepository.countActive(),
      clientsRepository.countByStatus(ClientStatus.ACTIVE),
      clientsRepository.countByStatus(ClientStatus.LEAD),
      clientsRepository.countByStatus(ClientStatus.INACTIVE),
    ]);

    return { total, active, leads, inactive };
  }

  async listPortalUsers(clientId: string): Promise<PortalUserDto[]> {
    const client = await clientsRepository.findById(clientId);
    if (!client) {
      throw new ClientsError(
        "Client not found",
        404,
        CLIENTS_ERROR_CODES.NOT_FOUND,
      );
    }

    const users = await clientsRepository.findPortalUsersByClientId(clientId);
    return users.map(toPortalUserDto);
  }

  async listUnlinkedPortalUsers(
    query: ListUnlinkedPortalUsersQueryInput,
  ): Promise<{
    items: PortalUserDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      timestamp: string;
    };
  }> {
    const { items, total } = await clientsRepository.findUnlinkedPortalUsers({
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    return {
      items: items.map(toPortalUserDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async linkPortalUser(
    clientId: string,
    input: LinkPortalUserInput,
    actor: ClientsActor,
  ): Promise<PortalUserDto> {
    const client = await clientsRepository.findById(clientId);
    if (!client) {
      throw new ClientsError(
        "Client not found",
        404,
        CLIENTS_ERROR_CODES.NOT_FOUND,
      );
    }

    const user = await clientsRepository.findPortalUserCandidate(input.userId);
    if (!user) {
      throw new ClientsError(
        "Portal user not found",
        404,
        CLIENTS_ERROR_CODES.PORTAL_USER_NOT_FOUND,
      );
    }

    if (user.role.code !== "CLIENT") {
      throw new ClientsError(
        "Only CLIENT role users can be linked to a Client company",
        400,
        CLIENTS_ERROR_CODES.PORTAL_USER_NOT_CLIENT,
        [
          {
            field: "userId",
            message: "Only CLIENT role users can be linked",
          },
        ],
      );
    }

    if (user.companyId === clientId) {
      throw new ClientsError(
        "This portal user is already linked to this Client company",
        409,
        CLIENTS_ERROR_CODES.PORTAL_USER_ALREADY_LINKED,
      );
    }

    // Never silently reassign across companies — Admin must unlink first.
    if (user.companyId) {
      const otherName = user.company?.companyName?.trim() || "another company";
      throw new ClientsError(
        `This portal user is already linked to ${otherName}. Unlink them first before linking here.`,
        409,
        CLIENTS_ERROR_CODES.PORTAL_USER_LINKED_ELSEWHERE,
        [
          {
            field: "userId",
            message: "Portal user is already linked to a different Client company",
          },
        ],
      );
    }

    const previousCompanyId = user.companyId;
    const updated = await clientsRepository.setUserCompanyId(
      user.id,
      clientId,
    );

    await logClientsAuditEvent({
      userId: actor.userId,
      action: CLIENTS_AUDIT_ACTIONS.PORTAL_USER_LINK,
      resourceId: clientId,
      metadata: {
        portalUserId: user.id,
        portalUserEmail: user.email,
        previousCompanyId,
        companyId: clientId,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toPortalUserDto(updated);
  }

  async unlinkPortalUser(
    clientId: string,
    userId: string,
    actor: ClientsActor,
  ): Promise<PortalUserDto> {
    const client = await clientsRepository.findById(clientId);
    if (!client) {
      throw new ClientsError(
        "Client not found",
        404,
        CLIENTS_ERROR_CODES.NOT_FOUND,
      );
    }

    const user = await clientsRepository.findPortalUserCandidate(userId);
    if (!user) {
      throw new ClientsError(
        "Portal user not found",
        404,
        CLIENTS_ERROR_CODES.PORTAL_USER_NOT_FOUND,
      );
    }

    if (user.companyId !== clientId) {
      throw new ClientsError(
        "This portal user is not linked to this Client company",
        409,
        CLIENTS_ERROR_CODES.PORTAL_USER_NOT_LINKED,
      );
    }

    const updated = await clientsRepository.setUserCompanyId(user.id, null);

    await logClientsAuditEvent({
      userId: actor.userId,
      action: CLIENTS_AUDIT_ACTIONS.PORTAL_USER_UNLINK,
      resourceId: clientId,
      metadata: {
        portalUserId: user.id,
        portalUserEmail: user.email,
        previousCompanyId: clientId,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toPortalUserDto(updated);
  }
}

export const clientsService = new ClientsService();
