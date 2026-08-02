/**
 * Memory monitoring / enterprise logging signals (safe, non-PII).
 */

import type { AiMemoryTelemetry } from "./memory-telemetry.js";

export interface AiMemoryMonitoring {
  readonly status: "ok" | "attention" | "fault";
  readonly logLine: string;
  readonly telemetry: AiMemoryTelemetry | null;
  readonly summary: string;
}

export function buildMemoryMonitoring(input: {
  readonly healthLevel?: string | null;
  readonly integrityValid: boolean;
  readonly telemetry?: AiMemoryTelemetry | null;
}): AiMemoryMonitoring {
  const status =
    !input.integrityValid || input.healthLevel === "critical"
      ? "fault"
      : input.healthLevel === "degraded"
        ? "attention"
        : "ok";

  const logLine = [
    "[ai-memory]",
    `status=${status}`,
    `health=${input.healthLevel ?? "n/a"}`,
    `integrity=${input.integrityValid ? "ok" : "fail"}`,
  ].join(" ");

  return Object.freeze({
    status,
    logLine,
    telemetry: input.telemetry ?? null,
    summary: `Monitoring ${status}`,
  });
}

/**
 * Emit enterprise log line when monitoring enabled (no secrets).
 */
export function emitMemoryMonitoringLog(monitoring: AiMemoryMonitoring): void {
  // eslint-disable-next-line no-console
  console.info(monitoring.logLine);
}
