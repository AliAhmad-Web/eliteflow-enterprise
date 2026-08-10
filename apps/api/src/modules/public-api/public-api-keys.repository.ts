import { prisma, type PublicApiKey } from "@enterprise/database";

export type PublicApiKeyRecord = PublicApiKey;

export class PublicApiKeysRepository {
  async create(input: {
    name: string;
    keyPrefix: string;
    keyHash: string;
    scopes: string[];
    ownerUserId: string;
    clientId: string | null;
    expiresAt: Date | null;
  }): Promise<PublicApiKeyRecord> {
    return prisma.publicApiKey.create({
      data: {
        name: input.name,
        keyPrefix: input.keyPrefix,
        keyHash: input.keyHash,
        scopes: input.scopes,
        ownerUserId: input.ownerUserId,
        clientId: input.clientId,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findByPrefix(keyPrefix: string): Promise<PublicApiKeyRecord | null> {
    return prisma.publicApiKey.findUnique({
      where: { keyPrefix },
    });
  }

  async findById(id: string): Promise<PublicApiKeyRecord | null> {
    return prisma.publicApiKey.findUnique({ where: { id } });
  }

  async listForOwner(ownerUserId: string): Promise<PublicApiKeyRecord[]> {
    return prisma.publicApiKey.findMany({
      where: { ownerUserId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async listAll(limit = 100): Promise<PublicApiKeyRecord[]> {
    return prisma.publicApiKey.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async revoke(id: string): Promise<PublicApiKeyRecord> {
    return prisma.publicApiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async touchLastUsed(id: string): Promise<void> {
    await prisma.publicApiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  async clientExists(clientId: string): Promise<boolean> {
    const row = await prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
      select: { id: true },
    });
    return Boolean(row);
  }
}

export const publicApiKeysRepository = new PublicApiKeysRepository();
