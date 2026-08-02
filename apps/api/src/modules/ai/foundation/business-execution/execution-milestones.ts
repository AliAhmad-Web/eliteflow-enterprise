/**
 * Execution milestones — checkpoints tied to phases.
 */

import type { AiBusinessExecutionPhase } from "./execution-phases.js";
import { sanitizeExecutionText } from "./execution-summary.js";

export interface AiBusinessExecutionMilestone {
  readonly id: string;
  readonly phaseId: string;
  readonly label: string;
  readonly order: number;
}

export function buildExecutionMilestones(
  phases: readonly AiBusinessExecutionPhase[],
): readonly AiBusinessExecutionMilestone[] {
  const milestones: AiBusinessExecutionMilestone[] = [];
  let order = 1;

  for (const phase of phases.slice(0, 4)) {
    milestones.push({
      id: `ms.${phase.id}.start`,
      phaseId: phase.id,
      label: sanitizeExecutionText(`Start ${phase.name}`, 60),
      order: order++,
    });
    milestones.push({
      id: `ms.${phase.id}.complete`,
      phaseId: phase.id,
      label: sanitizeExecutionText(`Complete ${phase.name}`, 60),
      order: order++,
    });
  }

  return Object.freeze(milestones.map((item) => Object.freeze(item)));
}
