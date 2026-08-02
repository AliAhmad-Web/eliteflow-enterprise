/**
 * In-process cache for persistent memory loads.
 * Gated by AI_MEMORY_CACHE. Never stores secrets.
 */

import type { AiMemoryEntry } from "../memory-entry.js";

export interface MemoryCacheEntry {
  readonly entries: readonly AiMemoryEntry[];
  readonly cachedAt: number;
  readonly expiresAt: number;
}

export class AiMemoryCache {
  private readonly store = new Map<string, MemoryCacheEntry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(options: { readonly ttlMs?: number; readonly maxEntries?: number } = {}) {
    this.ttlMs = options.ttlMs ?? 60_000;
    this.maxEntries = options.maxEntries ?? 200;
  }

  static cacheKey(input: {
    readonly userId: string;
    readonly conversationId?: string | null;
  }): string {
    return `${input.userId}:${input.conversationId ?? "*"}`;
  }

  get(key: string): readonly AiMemoryEntry[] | null {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return hit.entries;
  }

  set(key: string, entries: readonly AiMemoryEntry[]): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (typeof oldest === "string") {
        this.store.delete(oldest);
      }
    }
    const now = Date.now();
    this.store.set(
      key,
      Object.freeze({
        entries: Object.freeze([...entries]),
        cachedAt: now,
        expiresAt: now + this.ttlMs,
      }),
    );
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateUser(userId: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const enterpriseMemoryCache = new AiMemoryCache();
