/**
 * Central SIEM Integration Service — ingest, reliability pipeline, admin ops.
 */

import { logger } from "../logger.js";
import { getEnabledSiemProviders, getSiemConfig, isSiemEnabled } from "./siem.config.js";
import { SiemCircuitBreaker } from "./siem.circuit-breaker.js";
import {
  createTestSiemEvent,
  normalizeAuditEvent,
  normalizeMonitoringEvent,
  type NormalizeAuditInput,
  type NormalizeMonitoringInput,
} from "./siem.normalize.js";
import { maskSecret } from "./siem.auth.js";
import { SIEM_PROVIDER_ADAPTERS } from "./providers/index.js";
import { SiemQueue } from "./siem.queue.js";
import { exportEventsAsJson } from "./siem.transport.js";
import {
  SIEM_MONITORING_EVENTS,
  type SiemConfigSnapshot,
  type SiemConnectionStatus,
  type SiemDashboardMetrics,
  type SiemDeliveryResult,
  type SiemEvent,
  type SiemExportResult,
  type SiemProvider,
  type SiemRetryResult,
  type SiemStatusSnapshot,
  type SiemTestResult,
} from "./siem.types.js";

class SiemIntegrationService {
  private queue: SiemQueue;
  private circuit: SiemCircuitBreaker;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;

  private successfulDeliveries = 0;
  private failedDeliveries = 0;
  private lastExportAt: string | null = null;
  private lastErrorAt: string | null = null;
  private lastError: string | null = null;
  private connectedProviders = new Set<SiemProvider>();
  private throughputBucket: number[] = [];

  constructor() {
    const cfg = getSiemConfig();
    this.queue = new SiemQueue(cfg.maxQueueSize);
    this.circuit = new SiemCircuitBreaker(
      cfg.circuitFailureThreshold,
      cfg.circuitOpenMs,
    );
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    const cfg = getSiemConfig();
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, cfg.flushIntervalMs);
    if (typeof this.flushTimer.unref === "function") {
      this.flushTimer.unref();
    }
    this.emitInternal(SIEM_MONITORING_EVENTS.SIEM_CONNECTED, {
      enabled: cfg.enabled,
    });
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.started = false;
  }

  /** Fire-and-forget monitoring ingest — never throws. */
  ingestMonitoring(input: NormalizeMonitoringInput): void {
    try {
      if (!isSiemEnabled()) return;
      const event = normalizeMonitoringEvent(input);
      this.enqueue(event);
    } catch (error) {
      logger.error("[siem] ingestMonitoring failed:", error);
    }
  }

  /** Fire-and-forget audit ingest — never throws. */
  ingestAudit(input: NormalizeAuditInput): void {
    try {
      if (!isSiemEnabled()) return;
      const event = normalizeAuditEvent(input);
      this.enqueue(event);
    } catch (error) {
      logger.error("[siem] ingestAudit failed:", error);
    }
  }

  private enqueue(event: SiemEvent): void {
    const providers = getEnabledSiemProviders().map((p) => p.provider);
    if (providers.length === 0) {
      // Still buffer for later export / when providers are configured
      this.recordThroughput();
      this.queue.enqueue(event, ["GENERIC_WEBHOOK"]);
      return;
    }

    const item = this.queue.enqueue(event, providers);
    this.recordThroughput();
    if (!item) {
      this.emitInternal(SIEM_MONITORING_EVENTS.SIEM_QUEUE_FULL, {
        queueSize: this.queue.retrySize,
        offlineBufferSize: this.queue.offlineBufferSize,
      });
    }
  }

  private recordThroughput(): void {
    const now = Date.now();
    this.throughputBucket.push(now);
    const hourAgo = now - 60 * 60 * 1000;
    this.throughputBucket = this.throughputBucket.filter((t) => t >= hourAgo);
  }

  private backoffMs(attempts: number): number {
    const cfg = getSiemConfig();
    const exp = Math.min(
      cfg.maxBackoffMs,
      cfg.baseBackoffMs * 2 ** Math.max(0, attempts),
    );
    return exp;
  }

  async flush(): Promise<void> {
    if (!isSiemEnabled()) return;

    this.queue.restoreOfflineToRetry();
    const cfg = getSiemConfig();
    const ready = this.queue.dequeueReady(cfg.batchSize);
    if (ready.length === 0) return;

    const providerConfigs = new Map(
      getEnabledSiemProviders().map((p) => [p.provider, p]),
    );

    for (const item of ready) {
      const targets = item.providers.filter((p) => providerConfigs.has(p));
      let anySuccess = false;
      let lastErr: string | undefined;

      if (targets.length === 0) {
        lastErr = "No enabled providers";
      } else {
        for (const provider of targets) {
          if (!this.circuit.canAttempt(provider)) {
            lastErr = `Circuit open for ${provider}`;
            continue;
          }
          const pcfg = providerConfigs.get(provider)!;
          const adapter = SIEM_PROVIDER_ADAPTERS[provider];
          try {
            const result = await adapter.deliver([item.event], pcfg);
            if (result.success) {
              anySuccess = true;
              this.successfulDeliveries += 1;
              this.connectedProviders.add(provider);
              this.circuit.recordSuccess(provider);
            } else {
              lastErr = result.error ?? "Delivery failed";
              this.failedDeliveries += 1;
              this.circuit.recordFailure(provider);
              this.connectedProviders.delete(provider);
              this.emitInternal(SIEM_MONITORING_EVENTS.SIEM_DELIVERY_FAILED, {
                provider,
                error: lastErr,
              });
            }
          } catch (error) {
            lastErr = error instanceof Error ? error.message : "Delivery error";
            this.failedDeliveries += 1;
            this.circuit.recordFailure(provider);
            this.connectedProviders.delete(provider);
          }
        }
      }

      if (anySuccess) {
        this.lastExportAt = new Date().toISOString();
        this.emitInternal(SIEM_MONITORING_EVENTS.SIEM_EXPORT_SUCCESS, {
          eventType: item.event.eventType,
        });
      } else {
        const nextAttempts = item.attempts + 1;
        if (nextAttempts >= cfg.maxRetries) {
          this.queue.toDeadLetter(item, lastErr);
          this.lastError = lastErr ?? "Max retries exceeded";
          this.lastErrorAt = new Date().toISOString();
          this.emitInternal(SIEM_MONITORING_EVENTS.SIEM_EXPORT_FAILED, {
            error: this.lastError,
          });
        } else {
          this.queue.requeue(item, this.backoffMs(item.attempts), lastErr);
          this.emitInternal(SIEM_MONITORING_EVENTS.SIEM_RETRY, {
            attempts: nextAttempts,
            error: lastErr,
          });
        }
      }
    }

    if (this.connectedProviders.size === 0 && getEnabledSiemProviders().length > 0) {
      this.emitInternal(SIEM_MONITORING_EVENTS.SIEM_DISCONNECTED, {});
    }
  }

  private connectionStatus(): SiemConnectionStatus {
    if (!isSiemEnabled()) return "DISABLED";
    const enabled = getEnabledSiemProviders();
    if (enabled.length === 0) return "DISCONNECTED";
    if (this.connectedProviders.size === 0) {
      return this.failedDeliveries > 0 ? "DISCONNECTED" : "DISCONNECTED";
    }
    if (this.connectedProviders.size < enabled.length) return "DEGRADED";
    return "CONNECTED";
  }

  getStatus(): SiemStatusSnapshot {
    return {
      enabled: isSiemEnabled(),
      connectionStatus: this.connectionStatus(),
      queueSize: this.queue.retrySize,
      deadLetterSize: this.queue.deadLetterSize,
      offlineBufferSize: this.queue.offlineBufferSize,
      failedDeliveries: this.failedDeliveries,
      successfulDeliveries: this.successfulDeliveries,
      lastExportAt: this.lastExportAt,
      lastErrorAt: this.lastErrorAt,
      lastError: this.lastError,
      connectedProviders: [...this.connectedProviders],
      eventThroughputLastHour: this.throughputBucket.length,
      circuitBreakers: this.circuit.snapshot(),
      evaluatedAt: new Date().toISOString(),
    };
  }

  getConfig(): SiemConfigSnapshot {
    const cfg = getSiemConfig();
    return {
      enabled: cfg.enabled,
      batchSize: cfg.batchSize,
      maxQueueSize: cfg.maxQueueSize,
      maxRetries: cfg.maxRetries,
      providers: cfg.providers.map((p) => ({
        provider: p.provider,
        enabled: p.enabled,
        transport: p.transport,
        endpoint: p.endpoint
          ? p.endpoint.replace(/^(https?:\/\/[^/]+).*$/i, "$1/***")
          : null,
        authMode: p.authMode,
        hasCredential: Boolean(p.apiKey || p.bearerToken),
        syslogTarget: p.syslogTarget
          ? p.syslogTarget.replace(/:.+$/, ":***")
          : null,
      })),
      evaluatedAt: new Date().toISOString(),
    };
  }

  getDashboardMetrics(): SiemDashboardMetrics {
    const status = this.getStatus();
    return {
      connectionStatus: status.connectionStatus,
      queueSize: status.queueSize,
      failedDeliveries: status.failedDeliveries,
      lastExportAt: status.lastExportAt,
      connectedProviders: status.connectedProviders,
      eventThroughput: status.eventThroughputLastHour,
    };
  }

  async testConnectivity(): Promise<SiemTestResult> {
    const providers = getEnabledSiemProviders();
    const results: SiemDeliveryResult[] = [];
    const testEvent = createTestSiemEvent();

    if (providers.length === 0) {
      results.push({
        provider: "GENERIC_WEBHOOK",
        success: false,
        error: "No SIEM providers enabled",
        deliveredAt: new Date().toISOString(),
      });
    } else {
      for (const pcfg of providers) {
        const adapter = SIEM_PROVIDER_ADAPTERS[pcfg.provider];
        try {
          const result = await adapter.testConnection(pcfg);
          results.push(result);
          if (result.success) {
            this.connectedProviders.add(pcfg.provider);
            this.circuit.recordSuccess(pcfg.provider);
          } else {
            this.circuit.recordFailure(pcfg.provider);
          }
        } catch (error) {
          results.push({
            provider: pcfg.provider,
            success: false,
            error: error instanceof Error ? error.message : "Test failed",
            deliveredAt: new Date().toISOString(),
          });
        }
      }
    }

    // Always queue a local test event for observability
    this.queue.enqueue(testEvent, providers.map((p) => p.provider));

    const overallSuccess = results.some((r) => r.success);
    return {
      results,
      overallSuccess,
      testedAt: new Date().toISOString(),
    };
  }

  exportEvents(limit = 100): SiemExportResult {
    const events = this.queue.peekEvents(limit);
    this.lastExportAt = new Date().toISOString();
    // Touch JSON export path
    void exportEventsAsJson(events);
    this.emitInternal(SIEM_MONITORING_EVENTS.SIEM_EXPORT_SUCCESS, {
      exported: events.length,
    });
    return {
      exported: events.length,
      format: "json",
      events,
      exportedAt: this.lastExportAt,
    };
  }

  retryDeadLetters(limit?: number): SiemRetryResult {
    const requeued = this.queue.drainDeadLetter(limit).length;
    this.emitInternal(SIEM_MONITORING_EVENTS.SIEM_RETRY, { requeued });
    void this.flush();
    return {
      requeued,
      remainingDeadLetters: this.queue.deadLetterSize,
      retriedAt: new Date().toISOString(),
    };
  }

  /** Internal ops log only — never recursive into monitoring wrap. */
  private emitInternal(
    event: string,
    metadata: Record<string, unknown>,
  ): void {
    logger.info(`[siem] ${event}`, {
      ...metadata,
      // Ensure secrets never land in logs
      apiKey: maskSecret(undefined),
    });
  }
}

export const siemIntegrationService = new SiemIntegrationService();
