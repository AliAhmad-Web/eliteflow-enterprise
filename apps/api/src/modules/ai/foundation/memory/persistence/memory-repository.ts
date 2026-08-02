/**
 * Persistent AI Memory Repository.
 * Owns AiMemoryRecord Prisma access only — never touches AiConversation/AiMessage writes.
 */

import { prisma, type AiMemoryRecord, type Prisma } from "@enterprise/database";

export interface ListMemoryRecordsInput {
  readonly userId: string;
  readonly conversationId?: string | null;
  readonly types?: readonly string[];
  readonly limit?: number;
  readonly includeExpired?: boolean;
}

export interface UpsertMemoryRecordInput {
  readonly userId: string;
  readonly conversationId?: string | null;
  readonly memoryKey: string;
  readonly type: string;
  readonly scope: string;
  readonly priority: string;
  readonly summary: string;
  readonly source: string;
  readonly tagsJson: string;
  readonly permissionKeysJson: string;
  readonly recency: number;
  readonly expiresAt?: Date | null;
}

export class AiPersistentMemoryRepository {
  async listActive(input: ListMemoryRecordsInput): Promise<AiMemoryRecord[]> {
    const now = new Date();
    const andFilters: Prisma.AiMemoryRecordWhereInput[] = [];

    if (input.conversationId) {
      andFilters.push({
        OR: [
          { conversationId: input.conversationId },
          { conversationId: null },
        ],
      });
    }

    if (!input.includeExpired) {
      andFilters.push({
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      });
    }

    if (input.types && input.types.length > 0) {
      andFilters.push({ type: { in: [...input.types] } });
    }

    const where: Prisma.AiMemoryRecordWhereInput = {
      userId: input.userId,
      deletedAt: null,
      ...(andFilters.length > 0 ? { AND: andFilters } : {}),
    };

    return prisma.aiMemoryRecord.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { recency: "desc" }],
      take: Math.min(100, Math.max(1, input.limit ?? 40)),
    });
  }

  async upsertMany(
    records: readonly UpsertMemoryRecordInput[],
  ): Promise<AiMemoryRecord[]> {
    if (records.length === 0) return [];

    const results: AiMemoryRecord[] = [];
    for (const record of records) {
      const saved = await prisma.aiMemoryRecord.upsert({
        where: {
          userId_memoryKey: {
            userId: record.userId,
            memoryKey: record.memoryKey,
          },
        },
        create: {
          userId: record.userId,
          conversationId: record.conversationId ?? null,
          memoryKey: record.memoryKey,
          type: record.type,
          scope: record.scope,
          priority: record.priority,
          summary: record.summary,
          source: record.source,
          tagsJson: record.tagsJson,
          permissionKeysJson: record.permissionKeysJson,
          recency: record.recency,
          expiresAt: record.expiresAt ?? null,
        },
        update: {
          conversationId: record.conversationId ?? null,
          type: record.type,
          scope: record.scope,
          priority: record.priority,
          summary: record.summary,
          source: record.source,
          tagsJson: record.tagsJson,
          permissionKeysJson: record.permissionKeysJson,
          recency: record.recency,
          expiresAt: record.expiresAt ?? null,
          deletedAt: null,
        },
      });
      results.push(saved);
    }
    return results;
  }

  async softDeleteExpired(userId: string, now = new Date()): Promise<number> {
    const result = await prisma.aiMemoryRecord.updateMany({
      where: {
        userId,
        deletedAt: null,
        expiresAt: { lte: now },
      },
      data: { deletedAt: now },
    });
    return result.count;
  }

  async softDeleteByKeys(
    userId: string,
    memoryKeys: readonly string[],
  ): Promise<number> {
    if (memoryKeys.length === 0) return 0;
    const result = await prisma.aiMemoryRecord.updateMany({
      where: {
        userId,
        memoryKey: { in: [...memoryKeys] },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
    return result.count;
  }

  async countActive(userId: string): Promise<number> {
    const now = new Date();
    return prisma.aiMemoryRecord.count({
      where: {
        userId,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }
}

export const aiPersistentMemoryRepository =
  new AiPersistentMemoryRepository();
