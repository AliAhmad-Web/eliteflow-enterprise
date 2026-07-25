import type { Client as PrismaClientRecord, ClientStatus } from "@enterprise/database";
import type { ClientDto } from "@enterprise/shared";

export function toClientDto(client: PrismaClientRecord): ClientDto {
  return {
    id: client.id,
    companyName: client.companyName,
    contactName: client.contactName,
    email: client.email,
    phone: client.phone,
    website: client.website,
    addressLine1: client.addressLine1,
    city: client.city,
    country: client.country,
    status: client.status as ClientDto["status"],
    notes: client.notes,
    createdById: client.createdById,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

export type ClientStatusEnum = ClientStatus;
