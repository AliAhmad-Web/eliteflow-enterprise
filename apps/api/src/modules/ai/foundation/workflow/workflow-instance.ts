/**
 * Immutable Enterprise Workflow Plan (instance) model.
 * Orchestration planning only — never executes.
 */

import type { AiWorkflowDefinition } from "./workflow-definition.js";
import type { AiWorkflowStep } from "./workflow-step.js";
import type { AiWorkflowTransition } from "./workflow-transition.js";
import type { AiWorkflowCondition } from "./workflow-condition.js";
import type { AiWorkflowState } from "./workflow-state.js";
import type { AiWorkflowContext } from "./workflow-context.js";
import type { AiWorkflowMetadata } from "./workflow-metadata.js";
import type { AiWorkflowQueue } from "./workflow-queue.js";
import type { AiWorkflowValidation } from "./workflow-validator.js";

/**
 * Frozen workflow plan attached to pipeline state as `workflowPlan`.
 * Safe metadata only — never carries records, tokens, or secrets.
 */
export interface AiWorkflowPlan {
  readonly definition: AiWorkflowDefinition;
  readonly steps: readonly AiWorkflowStep[];
  readonly transitions: readonly AiWorkflowTransition[];
  readonly conditions: readonly AiWorkflowCondition[];
  readonly state: AiWorkflowState;
  readonly context: AiWorkflowContext;
  readonly metadata: AiWorkflowMetadata;
  readonly queue: AiWorkflowQueue;
  readonly validation: AiWorkflowValidation;
  readonly confidence: number;
  readonly summary: string;
  readonly notes: readonly string[];
  /** Retry policy metadata (not executed). */
  readonly retries: {
    readonly enabled: boolean;
    readonly maxAttempts: number;
  };
  /** Waiting-state ids (not entered). */
  readonly waitingStates: readonly string[];
}

/** Alias used by orchestrator instance builders. */
export type AiWorkflowInstance = AiWorkflowPlan;
