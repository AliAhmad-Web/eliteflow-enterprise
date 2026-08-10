import type {
  Client as PrismaClientRecord,
  ClientActivity as PrismaClientActivityRecord,
  ClientStatus,
} from "@enterprise/database";
import type { ClientActivityDto, ClientDto } from "@enterprise/shared";

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
    pipelineStage: client.pipelineStage as ClientDto["pipelineStage"],
    notes: client.notes,
    createdById: client.createdById,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

type ClientActivityWithCreator = PrismaClientActivityRecord & {
  createdBy?: { firstName: string; lastName: string } | null;
};

export function toClientActivityDto(
  activity: ClientActivityWithCreator,
): ClientActivityDto {
  const createdByName = activity.createdBy
    ? `${activity.createdBy.firstName} ${activity.createdBy.lastName}`.trim()
    : null;

  return {
    id: activity.id,
    clientId: activity.clientId,
    type: activity.type as ClientActivityDto["type"],
    title: activity.title,
    body: activity.body,
    occurredAt: activity.occurredAt.toISOString(),
    createdById: activity.createdById,
    createdByName,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
  };
}

export type ClientStatusEnum = ClientStatus;
