/**
 * Execution phases — ordered stages of the plan.
 */

import { sanitizeExecutionText } from "./execution-summary.js";

export type AiBusinessExecutionPhaseStatus =
  | "planned"
  | "ready"
  | "blocked"
  | "deferred";

export interface AiBusinessExecutionPhase {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly status: AiBusinessExecutionPhaseStatus;
  readonly objective: string;
}

export function formatExecutionPhaseStatus(
  status: AiBusinessExecutionPhaseStatus,
): string {
  switch (status) {
    case "planned":
      return "Planned";
    case "ready":
      return "Ready";
    case "blocked":
      return "Blocked";
    case "deferred":
      return "Deferred";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function buildExecutionPhases(input: {
  readonly recommendationCount: number;
  readonly priority: "low" | "medium" | "high" | "critical";
  readonly hasCriticalRisk: boolean;
}): readonly AiBusinessExecutionPhase[] {
  const phases: AiBusinessExecutionPhase[] = [
    {
      id: "phase.prepare",
      name: "Prepare",
      order: 1,
      status: "ready",
      objective: "Validate recommendations and confirm execution scope",
    },
    {
      id: "phase.execute",
      name: "Execute",
      order: 2,
      status: input.hasCriticalRisk ? "blocked" : "planned",
      objective: sanitizeExecutionText(
        `Apply ${input.recommendationCount} prioritized recommendation${input.recommendationCount === 1 ? "" : "s"}`,
      ),
    },
    {
      id: "phase.measure",
      name: "Measure",
      order: 3,
      status: "planned",
      objective: "Track KPI movement and operational outcomes",
    },
    {
      id: "phase.stabilize",
      name: "Stabilize",
      order: 4,
      status:
        input.priority === "critical" || input.priority === "high"
          ? "planned"
          : "deferred",
      objective: "Lock in gains and document follow-up controls",
    },
  ];

  return Object.freeze(
    phases.map((phase) =>
      Object.freeze({
        ...phase,
        name: sanitizeExecutionText(phase.name, 40),
        objective: sanitizeExecutionText(phase.objective, 120),
      }),
    ),
  );
}
