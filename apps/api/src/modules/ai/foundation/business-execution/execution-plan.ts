/**
 * Execution plan container — structured plan metadata.
 */

import type { AiBusinessExecutionPhase } from "./execution-phases.js";
import type { AiBusinessExecutionMilestone } from "./execution-milestones.js";
import type { AiBusinessExecutionDependency } from "./execution-dependencies.js";

export interface AiBusinessExecutionPlan {
  readonly id: string;
  readonly name: string;
  readonly phases: readonly AiBusinessExecutionPhase[];
  readonly milestones: readonly AiBusinessExecutionMilestone[];
  readonly dependencies: readonly AiBusinessExecutionDependency[];
  readonly plannedAt: string;
  readonly executable: boolean;
}

export function buildExecutionPlan(input: {
  readonly phases: readonly AiBusinessExecutionPhase[];
  readonly milestones: readonly AiBusinessExecutionMilestone[];
  readonly dependencies: readonly AiBusinessExecutionDependency[];
  readonly priority: "low" | "medium" | "high" | "critical";
  readonly recommendationCount: number;
}): AiBusinessExecutionPlan {
  return Object.freeze({
    id: "exec.plan.primary",
    name:
      input.recommendationCount > 0
        ? "Primary Business Execution Plan"
        : "Idle Business Execution Plan",
    phases: input.phases,
    milestones: input.milestones,
    dependencies: input.dependencies,
    plannedAt: new Date().toISOString(),
    executable:
      input.recommendationCount > 0 &&
      (input.priority === "critical" ||
        input.priority === "high" ||
        input.priority === "medium"),
  });
}
