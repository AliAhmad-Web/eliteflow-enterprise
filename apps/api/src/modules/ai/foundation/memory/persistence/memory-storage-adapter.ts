/**
 * Memory storage adapter — maps repository rows ↔ runtime memory entries.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import { compressMemoryEntries } from "../memory-compression.js";
import { deserializeMemoryRows } from "./memory-deserializer.js";
import { resolveMemoryExpiresAt } from "./memory-expiration.js";
import {
  aiPersistentMemoryRepository,
  type AiPersistentMemoryRepository,
  type UpsertMemoryRecordInput,
} from "./memory-repository.js";
import {
  buildMemoryKey,
  serializeMemoryEntry,
  serializeMemoryTags,
  serializePermissionKeys,
} from "./memory-serializer.js";

export interface MemoryStorageLoadInput {
  readonly userId: string;
  readonly conversationId?: string | null;
  readonly types?: readonly string[];
  readonly limit?: number;
  readonly compress?: boolean;
}

export interface MemoryStorageSaveInput {
  readonly userId: string;
  readonly conversationId?: string | null;
  readonly entries: readonly AiMemoryEntry[];
}

export class MemoryStorageAdapter {
  constructor(
    private readonly repository: AiPersistentMemoryRepository = aiPersistentMemoryRepository,
  ) {}

  async load(
    input: MemoryStorageLoadInput,
  ): Promise<readonly AiMemoryEntry[]> {
    const rows = await this.repository.listActive({
      userId: input.userId,
      conversationId: input.conversationId,
      types: input.types,
      limit: input.limit ?? 40,
      includeExpired: false,
    });

    let entries = deserializeMemoryRows(rows);
    if (input.compress !== false) {
      entries = compressMemoryEntries({
        entries,
        maxEntries: input.limit ?? 40,
        maxSummaryLength: 160,
      });
    }
    return entries;
  }

  async save(input: MemoryStorageSaveInput): Promise<readonly string[]> {
    const payloads: UpsertMemoryRecordInput[] = input.entries.map((entry) => {
      const serialized = serializeMemoryEntry(entry, {
        conversationId: input.conversationId,
        expiresAt: resolveMemoryExpiresAt(entry)?.toISOString() ?? null,
      });
      return {
        userId: input.userId,
        conversationId: input.conversationId ?? null,
        memoryKey: serialized.memoryKey || buildMemoryKey(entry),
        type: serialized.type,
        scope: serialized.scope,
        priority: serialized.priority,
        summary: serialized.summary,
        source: serialized.source,
        tagsJson: serializeMemoryTags(serialized.tags),
        permissionKeysJson: serializePermissionKeys(serialized.permissionKeys),
        recency: serialized.recency,
        expiresAt: resolveMemoryExpiresAt(entry),
      };
    });

    const saved = await this.repository.upsertMany(payloads);
    return Object.freeze(saved.map((row) => row.memoryKey));
  }
}

export const memoryStorageAdapter = new MemoryStorageAdapter();
