/**
 * Aggregate Enterprise Memory Platform snapshot.
 */

import type { AiMemoryAnalytics } from "./memory-analytics.js";
import type { AiMemoryDiagnostics } from "./memory-diagnostics.js";
import type { AiMemoryHealth } from "./memory-health.js";
import type { AiMemoryIntegrityReport } from "./memory-integrity.js";
import type { AiMemoryMonitoring } from "./memory-monitoring.js";
import type { AiMemoryOptimization } from "./memory-optimization.js";
import type { AiMemoryOrchestration } from "./memory-orchestrator.js";
import type { AiMemoryPerformanceMetrics } from "./memory-performance.js";
import type { AiMemoryTelemetry } from "./memory-telemetry.js";

export interface AiMemoryPlatform {
  readonly orchestration: AiMemoryOrchestration;
  readonly integrity: AiMemoryIntegrityReport;
  readonly optimization?: AiMemoryOptimization;
  readonly health?: AiMemoryHealth;
  readonly diagnostics?: AiMemoryDiagnostics;
  readonly analytics?: AiMemoryAnalytics;
  readonly monitoring?: AiMemoryMonitoring;
  readonly telemetry?: AiMemoryTelemetry;
  readonly performance?: AiMemoryPerformanceMetrics;
  readonly confidence: number;
  readonly summary: string;
  readonly notes: readonly string[];
}
