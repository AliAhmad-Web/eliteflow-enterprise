/**
 * Serialize / deserialize helpers for persistent memory payloads.
 * Never embeds secrets, tokens, or raw internal pipeline state.
 */

import type { AiMemoryPriority } from "../memory-priority.js";
import {
  isAiMemoryScope,
  type AiMemoryScope,
} from "../memory-scope.js";
import { isAiMemoryType, type AiMemoryType } from "../memory-types.js";
import {
  freezeMemoryEntry,
  sanitizeMemoryText,
  type AiMemoryEntry,
} from "../memory-entry.js";

const PRIORITIES: readonly AiMemoryPriority[] = [
  "low",
  "medium",
  "high",
  "critical",
];

export interface SerializedMemoryRecord {
  readonly memoryKey: string;
  readonly type: string;
  readonly scope: string;
  readonly priority: string;
  readonly summary: string;
  readonly source: string;
  readonly tags: readonly string[];
  readonly permissionKeys: readonly string[];
  readonly recency: number;
  readonly createdAt: string;
  readonly conversationId?: string | null;
  readonly expiresAt?: string | null;
}

function isPriority(value: string): value is AiMemoryPriority {
  return (PRIORITIES as readonly string[]).includes(value);
}

export function serializeMemoryTags(tags: readonly string[]): string {
  return JSON.stringify(
    tags.map((t) => sanitizeMemoryText(t, 40)).filter(Boolean).slice(0, 12),
  );
}

export function serializePermissionKeys(keys: readonly string[]): string {
  return JSON.stringify(
    keys.map((k) => sanitizeMemoryText(k, 64)).filter(Boolean).slice(0, 12),
  );
}

export function deserializeStringArray(raw: string): readonly string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return Object.freeze([]);
    return Object.freeze(
      parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => sanitizeMemoryText(item, 64))
        .filter(Boolean)
        .slice(0, 12),
    );
  } catch {
    return Object.freeze([]);
  }
}

export function buildMemoryKey(entry: AiMemoryEntry): string {
  const tag = entry.tags[0] ?? "default";
  return sanitizeMemoryText(`${entry.type}:${entry.source}:${tag}`, 128)
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export function serializeMemoryEntry(
  entry: AiMemoryEntry,
  options: {
    readonly conversationId?: string | null;
    readonly expiresAt?: string | null;
  } = {},
): SerializedMemoryRecord {
  return Object.freeze({
    memoryKey: buildMemoryKey(entry),
    type: entry.type,
    scope: entry.scope,
    priority: entry.priority,
    summary: sanitizeMemoryText(entry.summary, 500),
    source: sanitizeMemoryText(entry.source, 64),
    tags: entry.tags,
    permissionKeys: entry.permissionKeys,
    recency: entry.recency,
    createdAt: entry.createdAt,
    conversationId: options.conversationId ?? null,
    expiresAt: options.expiresAt ?? null,
  });
}

export function deserializeMemoryEntry(
  record: SerializedMemoryRecord & { readonly id?: string },
): AiMemoryEntry | null {
  if (!isAiMemoryType(record.type)) return null;
  if (!isAiMemoryScope(record.scope)) return null;
  if (!isPriority(record.priority)) return null;

  const type: AiMemoryType = record.type;
  const scope: AiMemoryScope = record.scope;
  const priority: AiMemoryPriority = record.priority;

  return freezeMemoryEntry({
    id: record.id ?? `mem.persisted.${record.memoryKey}`,
    type,
    scope,
    priority,
    summary: sanitizeMemoryText(record.summary, 160),
    source: sanitizeMemoryText(record.source, 64),
    permissionKeys: Object.freeze([...record.permissionKeys]),
    tags: Object.freeze([...record.tags]),
    recency: Math.min(1, Math.max(0, record.recency)),
    createdAt: record.createdAt,
  });
}
