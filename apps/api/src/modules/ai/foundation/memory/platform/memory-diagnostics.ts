/**
 * Memory diagnostics — actionable findings from platform state.
 */

import type { AiMemoryHealth } from "./memory-health.js";
import type { AiMemoryIntegrityReport } from "./memory-integrity.js";
import type { AiMemoryOptimization } from "./memory-optimization.js";

export interface AiMemoryDiagnosticFinding {
  readonly code: string;
  readonly severity: "info" | "warn" | "error";
  readonly message: string;
}

export interface AiMemoryDiagnostics {
  readonly findings: readonly AiMemoryDiagnosticFinding[];
  readonly summary: string;
}

export function buildMemoryDiagnostics(input: {
  readonly integrity: AiMemoryIntegrityReport;
  readonly health?: AiMemoryHealth | null;
  readonly optimization?: AiMemoryOptimization | null;
}): AiMemoryDiagnostics {
  const findings: AiMemoryDiagnosticFinding[] = [];

  if (!input.integrity.valid) {
    findings.push(
      Object.freeze({
        code: "integrity.invalid",
        severity: "warn",
        message: input.integrity.summary,
      }),
    );
  }
  if (input.integrity.duplicateCount > 0) {
    findings.push(
      Object.freeze({
        code: "duplicates.detected",
        severity: "info",
        message: `${input.integrity.duplicateCount} duplicate memories detected`,
      }),
    );
  }
  if (input.integrity.staleCount > 0) {
    findings.push(
      Object.freeze({
        code: "stale.detected",
        severity: "info",
        message: `${input.integrity.staleCount} stale memories detected`,
      }),
    );
  }
  if (input.health?.level === "degraded" || input.health?.level === "critical") {
    findings.push(
      Object.freeze({
        code: "health.low",
        severity: input.health.level === "critical" ? "error" : "warn",
        message: input.health.summary,
      }),
    );
  }
  if (input.optimization?.consolidationRecommended) {
    findings.push(
      Object.freeze({
        code: "consolidation.recommended",
        severity: "info",
        message: "Automatic consolidation recommended",
      }),
    );
  }

  if (findings.length === 0) {
    findings.push(
      Object.freeze({
        code: "ok",
        severity: "info",
        message: "No memory diagnostics issues",
      }),
    );
  }

  return Object.freeze({
    findings: Object.freeze(findings.slice(0, 12)),
    summary: `${findings.length} diagnostic finding(s)`,
  });
}
