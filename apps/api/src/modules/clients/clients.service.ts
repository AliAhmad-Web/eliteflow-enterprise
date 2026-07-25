import { ClientStatus } from "@enterprise/database";
import type {
  ClientDto,
  ClientListResponse,
  CreateClientInput,
  ListClientsQueryInput,
  UpdateClientInput,
} from "@enterprise/shared";

import { CLIENTS_ERROR_CODES, ClientsError } from "./clients.errors.js";
import { clientsRepository } from "./clients.repository.js";
import { toClientDto } from "./clients.types.js";

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
    return toClientDto(created);
  }

  async update(id: string, input: UpdateClientInput): Promise<ClientDto> {
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
    return toClientDto(updated);
  }

  async remove(id: string): Promise<{ id: string }> {
    const existing = await clientsRepository.findById(id);
    if (!existing) {
      throw new ClientsError(
        "Client not found",
        404,
        CLIENTS_ERROR_CODES.NOT_FOUND,
      );
    }

    await clientsRepository.softDelete(id);
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
}

export const clientsService = new ClientsService();
