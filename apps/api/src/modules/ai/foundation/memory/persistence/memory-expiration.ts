/**
 * Memory expiration policies for persistent records.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import type { AiMemoryType } from "../memory-types.js";

const DEFAULT_TTL_MS: Readonly<Record<AiMemoryType, number | null>> = {
  conversation: 7 * 24 * 60 * 60 * 1000,
  session: 24 * 60 * 60 * 1000,
  context: 12 * 60 * 60 * 1000,
  working: 2 * 60 * 60 * 1000,
  business: 14 * 24 * 60 * 60 * 1000,
  preference: null,
  user: null,
  longterm: null,
};

export function resolveMemoryExpiresAt(
  entry: AiMemoryEntry,
  now = Date.now(),
): Date | null {
  const ttl = DEFAULT_TTL_MS[entry.type];
  if (ttl == null) return null;
  return new Date(now + ttl);
}

export function isMemoryExpired(
  expiresAt: Date | string | null | undefined,
  now = new Date(),
): boolean {
  if (expiresAt == null) return false;
  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= now.getTime();
}

export function filterExpiredEntries(
  entries: readonly AiMemoryEntry[],
  expiresById?: ReadonlyMap<string, Date | string | null>,
  now = new Date(),
): readonly AiMemoryEntry[] {
  if (!expiresById || expiresById.size === 0) {
    return entries;
  }
  return Object.freeze(
    entries.filter((entry) => {
      const expires = expiresById.get(entry.id);
      return !isMemoryExpired(expires, now);
    }),
  );
}
