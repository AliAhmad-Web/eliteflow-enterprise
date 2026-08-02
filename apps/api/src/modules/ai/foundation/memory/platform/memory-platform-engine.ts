/**
 * Build unified Memory Platform snapshot from existing subsystem state.
 */

import { buildMemoryAnalytics } from "./memory-analytics.js";
import { buildMemoryDiagnostics } from "./memory-diagnostics.js";
import { scoreMemoryHealth } from "./memory-health.js";
import { validateMemoryIntegrity } from "./memory-integrity.js";
import {
  buildMemoryMonitoring,
  emitMemoryMonitoringLog,
} from "./memory-monitoring.js";
import { optimizeMemoryPlatform } from "./memory-optimization.js";
import {
  buildMemoryOrchestration,
  type AiMemoryOrchestration,
} from "./memory-orchestrator.js";
import { buildMemoryPerformanceMetrics } from "./memory-performance.js";
import type { AiMemoryPlatform } from "./memory-platform.js";
import { scheduleMemoryOptimizationJob } from "./memory-platform-jobs.js";
import { buildMemoryTelemetry } from "./memory-telemetry.js";
import type { AiMemoryEntry } from "../memory-entry.js";

export interface ResolveMemoryPlatformInput {
  readonly entries: readonly AiMemoryEntry[];
  readonly loadedCount: number;
  readonly workingCount: number;
  readonly episodicCount: number;
  readonly semanticHitCount: number;
  readonly longTermActiveCount: number;
  readonly consolidatedCount: number;
  readonly confidences: readonly number[];
  readonly fromCache: boolean;
  readonly consolidationPresent: boolean;
  readonly orchestration: AiMemoryOrchestration;
  readonly optimizationEnabled: boolean;
  readonly analyticsEnabled: boolean;
  readonly monitoringEnabled: boolean;
  readonly healthEnabled: boolean;
  readonly diagnosticsEnabled: boolean;
}

export async function resolveMemoryPlatform(
  input: ResolveMemoryPlatformInput,
): Promise<AiMemoryPlatform> {
  const integrity = validateMemoryIntegrity(input.entries);

  const optimization = input.optimizationEnabled
    ? optimizeMemoryPlatform({
        entries: input.entries,
        integrity,
        fromCache: input.fromCache,
        consolidationPresent: input.consolidationPresent,
      })
    : undefined;

  if (optimization?.consolidationRecommended) {
    await scheduleMemoryOptimizationJob({
      recommended: true,
      background: true,
      onRun: async () => {
        // Stage-owned consolidation remains authoritative; job is observability hook.
      },
    });
  }

  const health = input.healthEnabled
    ? scoreMemoryHealth({
        entryCount: input.entries.length,
        integrityValid: integrity.valid,
        duplicateCount: integrity.duplicateCount,
        staleCount: integrity.staleCount,
        subsystemEnabledCount: input.orchestration.subsystems.filter(
          (s) => s.enabled,
        ).length,
        subsystemTotal: input.orchestration.subsystems.length,
      })
    : undefined;

  const diagnostics = input.diagnosticsEnabled
    ? buildMemoryDiagnostics({
        integrity,
        health,
        optimization,
      })
    : undefined;

  const analytics = input.analyticsEnabled
    ? buildMemoryAnalytics({
        entryCount: input.entries.length,
        loadedCount: input.loadedCount,
        workingCount: input.workingCount,
        episodicCount: input.episodicCount,
        semanticHitCount: input.semanticHitCount,
        longTermActiveCount: input.longTermActiveCount,
        consolidatedCount: input.consolidatedCount,
        confidences: input.confidences,
      })
    : undefined;

  const telemetry =
    input.monitoringEnabled
      ? buildMemoryTelemetry({
          orchestrationSummary: input.orchestration.summary,
          healthLevel: health?.level,
          optimizationSummary: optimization?.summary,
          diagnosticCount: diagnostics?.findings.length,
        })
      : undefined;

  const monitoring = input.monitoringEnabled
    ? buildMemoryMonitoring({
        healthLevel: health?.level,
        integrityValid: integrity.valid,
        telemetry,
      })
    : undefined;

  if (monitoring) {
    emitMemoryMonitoringLog(monitoring);
  }

  const performance = input.optimizationEnabled || input.analyticsEnabled
    ? buildMemoryPerformanceMetrics({
        subsystemCount: input.orchestration.subsystems.length,
        enabledSubsystemCount: input.orchestration.subsystems.filter(
          (s) => s.enabled,
        ).length,
        duplicatesRemoved: optimization?.duplicatesRemoved ?? 0,
        staleRemoved: optimization?.staleRemoved ?? 0,
        adaptiveRetrieval: input.orchestration.adaptiveRetrieval,
        retrievalEnabled:
          input.orchestration.subsystems.find((s) => s.id === "retrieval")
            ?.enabled === true,
      })
    : undefined;

  const confidenceParts = [
    ...input.confidences,
    integrity.valid ? 0.8 : 0.4,
    health?.score,
    optimization?.confidence,
  ].filter((n): n is number => typeof n === "number");

  const confidence =
    confidenceParts.length === 0
      ? 0
      : Math.round(
          (confidenceParts.reduce((s, n) => s + n, 0) / confidenceParts.length) *
            1000,
        ) / 1000;

  return Object.freeze({
    orchestration: input.orchestration,
    integrity,
    optimization,
    health,
    diagnostics,
    analytics,
    monitoring,
    telemetry,
    performance,
    confidence,
    summary: [
      input.orchestration.summary,
      health?.summary,
      optimization?.summary,
      analytics?.summary,
    ]
      .filter(Boolean)
      .join(" | ")
      .slice(0, 240),
    notes: Object.freeze([
      integrity.valid ? "integrity:ok" : "integrity:fail",
      health ? `health:${health.level}` : "health:off",
      optimization ? "optimization:on" : "optimization:off",
      analytics ? "analytics:on" : "analytics:off",
      monitoring ? "monitoring:on" : "monitoring:off",
      diagnostics ? "diagnostics:on" : "diagnostics:off",
    ]),
  });
}

export { buildMemoryOrchestration };
