/**
 * Memory deserializer — converts stored records into runtime entries.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import {
  deserializeMemoryEntry,
  deserializeStringArray,
  type SerializedMemoryRecord,
} from "./memory-serializer.js";

export interface PersistableMemoryRow {
  readonly id: string;
  readonly memoryKey: string;
  readonly type: string;
  readonly scope: string;
  readonly priority: string;
  readonly summary: string;
  readonly source: string;
  readonly tagsJson: string;
  readonly permissionKeysJson: string;
  readonly recency: number;
  readonly createdAt: Date | string;
  readonly conversationId?: string | null;
  readonly expiresAt?: Date | string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function rowToSerializedRecord(
  row: PersistableMemoryRow,
): SerializedMemoryRecord & { readonly id: string } {
  return Object.freeze({
    id: row.id,
    memoryKey: row.memoryKey,
    type: row.type,
    scope: row.scope,
    priority: row.priority,
    summary: row.summary,
    source: row.source,
    tags: deserializeStringArray(row.tagsJson),
    permissionKeys: deserializeStringArray(row.permissionKeysJson),
    recency: row.recency,
    createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
    conversationId: row.conversationId ?? null,
    expiresAt: toIso(row.expiresAt),
  });
}

export function deserializeMemoryRows(
  rows: readonly PersistableMemoryRow[],
): readonly AiMemoryEntry[] {
  const entries: AiMemoryEntry[] = [];
  for (const row of rows) {
    const entry = deserializeMemoryEntry(rowToSerializedRecord(row));
    if (entry) entries.push(entry);
  }
  return Object.freeze(entries);
}
