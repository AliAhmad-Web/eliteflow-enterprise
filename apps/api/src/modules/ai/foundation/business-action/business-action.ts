/**
 * Immutable Enterprise Business Action model.
 * Structured executable plan from Business Decision — never executes here.
 */

import type { AiBusinessActionPlan } from "./business-action-plan.js";
import type { AiBusinessActionPriority } from "./business-action-priority.js";
import type { AiBusinessActionRisk } from "./business-action-risk.js";
import type { AiBusinessActionPermissions } from "./business-action-permissions.js";

export type AiBusinessActionKind =
  | "prioritize"
  | "review"
  | "monitor"
  | "respond"
  | "none";

/**
 * Frozen business action attached to pipeline state.
 * Safe metadata only — never carries records, emails, tokens, or secrets.
 * Actual execution must go through Tool Execution stages only.
 */
export interface AiBusinessAction {
  readonly kind: AiBusinessActionKind;
  readonly plan: AiBusinessActionPlan;
  readonly priority: AiBusinessActionPriority;
  readonly risk: AiBusinessActionRisk;
  readonly permissions: AiBusinessActionPermissions;
  readonly confidence: number;
  readonly summary: string;
  readonly notes: readonly string[];
}
