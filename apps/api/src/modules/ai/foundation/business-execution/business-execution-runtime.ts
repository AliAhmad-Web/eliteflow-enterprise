/**
 * Format Business Execution as safe Runtime Instructions metadata.
 * Never exposes internal objects, records, or secrets.
 */

import type { AiBusinessExecution } from "./business-execution.js";
import { formatExecutionHorizon } from "./execution-timeline.js";
import { formatExecutionPhaseStatus } from "./execution-phases.js";
import { formatExecutionRiskLevel } from "./execution-risks.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only business execution metadata for the Runtime section.
 */
export function formatBusinessExecutionForRuntime(
  execution: AiBusinessExecution | null | undefined,
): string {
  if (!execution) return "";

  const lines: string[] = [
    "Business Execution:",
    `Summary: ${sanitizeLine(execution.summary, 200)}`,
    `Timeline: ${formatExecutionHorizon(execution.timeline.horizon)}`,
    `Executable: ${execution.plan.executable ? "yes" : "no"}`,
    `Confidence: ${execution.confidence.toFixed(2)}`,
  ];

  if (execution.plan.phases.length > 0) {
    lines.push("Execution Phases:");
    for (const phase of execution.plan.phases.slice(0, 4)) {
      lines.push(
        `- [${formatExecutionPhaseStatus(phase.status)}] ${sanitizeLine(phase.name, 40)} — ${sanitizeLine(phase.objective, 80)}`,
      );
    }
  }

  if (execution.plan.milestones.length > 0) {
    lines.push(
      `Milestones: ${execution.plan.milestones
        .slice(0, 4)
        .map((m) => sanitizeLine(m.label, 40))
        .join("; ")}`,
    );
  }

  const elevatedRisks = execution.risks.filter((r) => r.level !== "low");
  if (elevatedRisks.length > 0) {
    lines.push("Execution Risks:");
    for (const risk of elevatedRisks.slice(0, 3)) {
      lines.push(
        `- [${formatExecutionRiskLevel(risk.level)}] ${sanitizeLine(risk.text, 100)}`,
      );
    }
  }

  if (execution.rollback.steps.length > 0) {
    lines.push(
      `Rollback: ${sanitizeLine(execution.rollback.summary, 120)}`,
    );
  }

  return lines.join("\n").trim();
}
