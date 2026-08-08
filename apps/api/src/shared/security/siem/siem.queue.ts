/**
 * SIEM reliability queues: retry, DLQ, AES-encrypted offline buffer.
 */

import { randomUUID } from "node:crypto";

import { encryptionService } from "../encryption.service.js";
import { logger } from "../logger.js";
import type { SiemEvent, SiemProvider, SiemQueuedItem } from "./siem.types.js";

export class SiemQueue {
  private retryQueue: SiemQueuedItem[] = [];
  private deadLetter: SiemQueuedItem[] = [];
  /** Encrypted offline buffer payloads (enterprise encryption). */
  private offlineBuffer: string[] = [];

  constructor(private readonly maxQueueSize: number) {}

  get retrySize(): number {
    return this.retryQueue.length;
  }

  get deadLetterSize(): number {
    return this.deadLetter.length;
  }

  get offlineBufferSize(): number {
    return this.offlineBuffer.length;
  }

  enqueue(
    event: SiemEvent,
    providers: SiemProvider[],
    delayMs = 0,
  ): SiemQueuedItem | null {
    if (this.retryQueue.length >= this.maxQueueSize) {
      this.pushOffline(event, providers);
      return null;
    }
    const item: SiemQueuedItem = {
      id: randomUUID(),
      event,
      providers,
      attempts: 0,
      nextAttemptAt: Date.now() + delayMs,
      createdAt: Date.now(),
    };
    this.retryQueue.push(item);
    return item;
  }

  /** Items ready for delivery (due now). */
  dequeueReady(limit: number): SiemQueuedItem[] {
    const now = Date.now();
    const ready: SiemQueuedItem[] = [];
    const remaining: SiemQueuedItem[] = [];
    for (const item of this.retryQueue) {
      if (ready.length < limit && item.nextAttemptAt <= now) {
        ready.push(item);
      } else {
        remaining.push(item);
      }
    }
    this.retryQueue = remaining;
    return ready;
  }

  requeue(
    item: SiemQueuedItem,
    backoffMs: number,
    error?: string,
  ): void {
    const next: SiemQueuedItem = {
      ...item,
      attempts: item.attempts + 1,
      nextAttemptAt: Date.now() + backoffMs,
      lastError: error,
    };
    if (this.retryQueue.length >= this.maxQueueSize) {
      this.pushOffline(next.event, next.providers);
      return;
    }
    this.retryQueue.push(next);
  }

  toDeadLetter(item: SiemQueuedItem, error?: string): void {
    this.deadLetter.push({
      ...item,
      attempts: item.attempts + 1,
      lastError: error,
    });
    // Cap DLQ growth
    if (this.deadLetter.length > this.maxQueueSize) {
      this.deadLetter.shift();
    }
  }

  drainDeadLetter(limit?: number): SiemQueuedItem[] {
    const take = limit ?? this.deadLetter.length;
    const items = this.deadLetter.splice(0, take);
    for (const item of items) {
      this.retryQueue.push({
        ...item,
        attempts: 0,
        nextAttemptAt: Date.now(),
        lastError: undefined,
      });
    }
    return items;
  }

  /** Peek recent events for JSON export (from retry + DLQ). */
  peekEvents(limit: number): SiemEvent[] {
    const combined = [
      ...this.retryQueue.map((i) => i.event),
      ...this.deadLetter.map((i) => i.event),
    ];
    return combined.slice(0, limit);
  }

  restoreOfflineToRetry(): number {
    let restored = 0;
    while (
      this.offlineBuffer.length > 0 &&
      this.retryQueue.length < this.maxQueueSize
    ) {
      const encrypted = this.offlineBuffer.shift();
      if (!encrypted) break;
      try {
        const json = encryptionService.decrypt(encrypted);
        const parsed = JSON.parse(json) as {
          event: SiemEvent;
          providers: SiemProvider[];
        };
        this.retryQueue.push({
          id: randomUUID(),
          event: parsed.event,
          providers: parsed.providers,
          attempts: 0,
          nextAttemptAt: Date.now(),
          createdAt: Date.now(),
        });
        restored += 1;
      } catch (error) {
        logger.error("[siem] Failed to restore offline buffer item:", error);
      }
    }
    return restored;
  }

  private pushOffline(event: SiemEvent, providers: SiemProvider[]): void {
    try {
      const encrypted = encryptionService.encrypt(
        JSON.stringify({ event, providers }),
      );
      this.offlineBuffer.push(encrypted);
      if (this.offlineBuffer.length > this.maxQueueSize) {
        this.offlineBuffer.shift();
      }
    } catch (error) {
      logger.error("[siem] Failed to encrypt offline buffer item:", error);
    }
  }
}
