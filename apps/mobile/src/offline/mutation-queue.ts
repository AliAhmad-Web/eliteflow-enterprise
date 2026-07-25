import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { apiRequest } from "@/api/api-client";
import { queryClient } from "@/api/query-client";

const QUEUE_KEY = "eliteflow-mobile-mutation-queue";

export type QueuedMutationMethod = "POST" | "PATCH" | "PUT" | "DELETE";

export interface QueuedMutation {
  id: string;
  createdAt: string;
  path: string;
  method: QueuedMutationMethod;
  body?: unknown;
  /** Query keys to invalidate after success */
  invalidateKeys?: readonly (readonly unknown[])[];
  /** Human label for conflict UI */
  label: string;
  attempts: number;
  lastError?: string;
  status: "pending" | "failed" | "conflict";
}

type QueueListener = (items: QueuedMutation[]) => void;

const listeners = new Set<QueueListener>();
let flushing = false;

function notify(items: QueuedMutation[]) {
  listeners.forEach((l) => l(items));
}

async function readQueue(): Promise<QueuedMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedMutation[];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedMutation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  notify(items);
}

function newId() {
  return `mq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Offline mutation outbox.
 * Enqueue when offline / network fails; flush on reconnect.
 * Conflict = HTTP 409 or 422 from server (kept for user resolution).
 */
export const mutationQueue = {
  subscribe(listener: QueueListener) {
    listeners.add(listener);
    void readQueue().then(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  async list() {
    return readQueue();
  },

  async enqueue(
    input: Omit<QueuedMutation, "id" | "createdAt" | "attempts" | "status">,
  ) {
    const items = await readQueue();
    const next: QueuedMutation = {
      ...input,
      id: newId(),
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: "pending",
    };
    items.push(next);
    await writeQueue(items);
    return next;
  },

  async remove(id: string) {
    const items = (await readQueue()).filter((i) => i.id !== id);
    await writeQueue(items);
  },

  /** Reset a failed/conflict item to pending and attempt flush. */
  async retry(id: string) {
    const items = await readQueue();
    const next = items.map((item) =>
      item.id === id
        ? {
            ...item,
            status: "pending" as const,
            lastError: undefined,
          }
        : item,
    );
    await writeQueue(next);
    return this.flush();
  },

  /** Discard a conflicted mutation without syncing. */
  async discard(id: string) {
    await this.remove(id);
  },

  /** Keep local version: drop conflict flag and retry once. */
  async resolveKeepLocal(id: string) {
    return this.retry(id);
  },

  async flush(): Promise<{ synced: number; failed: number; conflicts: number }> {
    if (flushing) return { synced: 0, failed: 0, conflicts: 0 };
    flushing = true;

    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        return { synced, failed, conflicts };
      }

      let items = await readQueue();
      const remaining: QueuedMutation[] = [];

      for (const item of items) {
        if (item.status === "conflict") {
          remaining.push(item);
          conflicts += 1;
          continue;
        }

        try {
          await apiRequest(item.path, {
            method: item.method,
            body: item.body,
            auth: true,
          });
          synced += 1;
          if (item.invalidateKeys) {
            for (const key of item.invalidateKeys) {
              await queryClient.invalidateQueries({ queryKey: key });
            }
          }
        } catch (err) {
          const status =
            typeof err === "object" &&
            err !== null &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
              ? (err as { status: number }).status
              : 0;
          const message =
            err instanceof Error ? err.message : "Sync failed";

          if (status === 409 || status === 422) {
            remaining.push({
              ...item,
              status: "conflict",
              attempts: item.attempts + 1,
              lastError: message,
            });
            conflicts += 1;
          } else if (item.attempts + 1 >= 5) {
            remaining.push({
              ...item,
              status: "failed",
              attempts: item.attempts + 1,
              lastError: message,
            });
            failed += 1;
          } else {
            remaining.push({
              ...item,
              status: "pending",
              attempts: item.attempts + 1,
              lastError: message,
            });
            failed += 1;
          }
        }
      }

      await writeQueue(remaining);
    } finally {
      flushing = false;
    }

    return { synced, failed, conflicts };
  },
};

/** Wire NetInfo → automatic flush on reconnect. */
export function startMutationQueueSync() {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      void mutationQueue.flush();
    }
  });
}

/**
 * Helper: try online mutation; on network failure enqueue for later.
 */
export async function mutateOrEnqueue<T>(options: {
  online: () => Promise<T>;
  queue: Omit<QueuedMutation, "id" | "createdAt" | "attempts" | "status">;
}): Promise<{ result?: T; queued: boolean }> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    await mutationQueue.enqueue(options.queue);
    return { queued: true };
  }

  try {
    const result = await options.online();
    return { result, queued: false };
  } catch (err) {
    const isNetwork =
      err instanceof TypeError ||
      (err instanceof Error &&
        /network|timeout|failed to fetch/i.test(err.message));
    if (isNetwork) {
      await mutationQueue.enqueue(options.queue);
      return { queued: true };
    }
    throw err;
  }
}
