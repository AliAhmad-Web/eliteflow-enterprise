/**
 * Scale readiness helpers (Phase 8 Phase 2).
 * Application-level batching / concurrency / lazy init — no API redesign.
 */

import { isSaasScaleReadinessEnabled } from "../feature-flags";

/** Run async tasks with a concurrency limit. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!isSaasScaleReadinessEnabled() || concurrency <= 1) {
    const out: R[] = [];
    for (let i = 0; i < items.length; i += 1) {
      out.push(await mapper(items[i]!, i));
    }
    return out;
  }

  const limit = Math.max(1, Math.min(concurrency, items.length || 1));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current]!, current);
    }
  }

  await Promise.all(
    Array.from({ length: limit }, () => worker()),
  );
  return results;
}

/** Batch an array into fixed-size chunks. */
export function batchItems<T>(items: readonly T[], size: number): T[][] {
  const chunkSize = Math.max(1, size);
  if (!isSaasScaleReadinessEnabled()) {
    return [items.slice() as T[]];
  }
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    batches.push(items.slice(i, i + chunkSize) as T[]);
  }
  return batches;
}

/** Lazy singleton factory with shared reuse. */
export function createLazySingleton<T>(factory: () => T): () => T {
  let value: T | undefined;
  let created = false;
  return () => {
    if (!isSaasScaleReadinessEnabled()) {
      return factory();
    }
    if (!created) {
      value = factory();
      created = true;
    }
    return value as T;
  };
}

/** Compose shared resource getters (simple memo by key). */
export function createSharedResourceMap<T>(): {
  get: (key: string, factory: () => T) => T;
  clear: () => void;
} {
  const map = new Map<string, T>();
  return {
    get(key, factory) {
      if (!isSaasScaleReadinessEnabled()) {
        return factory();
      }
      const existing = map.get(key);
      if (existing !== undefined) return existing;
      const created = factory();
      map.set(key, created);
      return created;
    },
    clear() {
      map.clear();
    },
  };
}
