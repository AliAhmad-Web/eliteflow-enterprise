/**
 * Immutable Enterprise Business Workflow model.
 * Structured workflow from Business Action — never executes here.
 */

import type { AiBusinessWorkflowDefinition } from "./business-workflow-definition.js";
import type { AiBusinessWorkflowStep } from "./business-workflow-steps.js";
import type { AiBusinessWorkflowTransition } from "./business-workflow-transitions.js";
import type { AiBusinessWorkflowCondition } from "./business-workflow-permissions.js";

export type AiBusinessWorkflowStatus =
  | "planned"
  | "ready"
  | "blocked"
  | "idle";

/**
 * Frozen business workflow attached to pipeline state.
 * Safe metadata only — never carries records, emails, tokens, or secrets.
 * Actual execution must go through Tool Execution stages only.
 */
export interface AiBusinessWorkflow {
  readonly definition: AiBusinessWorkflowDefinition;
  readonly status: AiBusinessWorkflowStatus;
  readonly steps: readonly AiBusinessWorkflowStep[];
  readonly transitions: readonly AiBusinessWorkflowTransition[];
  readonly conditions: readonly AiBusinessWorkflowCondition[];
  readonly confidence: number;
  readonly summary: string;
  readonly notes: readonly string[];
}
