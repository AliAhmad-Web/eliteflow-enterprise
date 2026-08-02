/**
 * Enterprise Memory Platform public exports.
 */

export type { AiMemoryLifecyclePhase, AiMemoryLifecyclePlan } from "./memory-lifecycle.js";
export {
  AI_MEMORY_LIFECYCLE_ORDER,
  formatMemoryLifecyclePhase,
  buildMemoryLifecyclePlan,
} from "./memory-lifecycle.js";

export type {
  AiMemoryOrchestration,
  AiMemorySubsystemStatus,
  BuildMemoryOrchestrationInput,
} from "./memory-orchestrator.js";
export {
  buildMemoryOrchestration,
  memoryOrchestrator,
} from "./memory-orchestrator.js";

export type { AiMemoryIntegrityReport } from "./memory-integrity.js";
export { validateMemoryIntegrity } from "./memory-integrity.js";

export type { AiMemoryOptimization } from "./memory-optimization.js";
export { optimizeMemoryPlatform } from "./memory-optimization.js";

export type { AiMemoryHealth } from "./memory-health.js";
export { scoreMemoryHealth } from "./memory-health.js";

export type {
  AiMemoryDiagnosticFinding,
  AiMemoryDiagnostics,
} from "./memory-diagnostics.js";
export { buildMemoryDiagnostics } from "./memory-diagnostics.js";

export type { AiMemoryAnalytics } from "./memory-analytics.js";
export { buildMemoryAnalytics } from "./memory-analytics.js";

export type { AiMemoryPerformanceMetrics } from "./memory-performance.js";
export { buildMemoryPerformanceMetrics } from "./memory-performance.js";

export type {
  AiMemoryTelemetry,
  AiMemoryTelemetryEvent,
} from "./memory-telemetry.js";
export { buildMemoryTelemetry } from "./memory-telemetry.js";

export type { AiMemoryMonitoring } from "./memory-monitoring.js";
export {
  buildMemoryMonitoring,
  emitMemoryMonitoringLog,
} from "./memory-monitoring.js";

export type { AiMemoryPlatform } from "./memory-platform.js";

export type { ResolveMemoryPlatformInput } from "./memory-platform-engine.js";
export { resolveMemoryPlatform } from "./memory-platform-engine.js";

export {
  scheduleMemoryOptimizationJob,
  queueMemoryPlatformMaintenance,
} from "./memory-platform-jobs.js";

export { formatMemoryPlatformForRuntime } from "./memory-platform-runtime.js";
