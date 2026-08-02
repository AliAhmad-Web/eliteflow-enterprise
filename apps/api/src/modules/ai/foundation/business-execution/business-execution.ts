/**
 * Immutable Enterprise Business Execution model.
 * Structured execution plan from recommendations — never executes here.
 */

import type { AiBusinessExecutionPlan } from "./execution-plan.js";
import type { AiBusinessExecutionTimeline } from "./execution-timeline.js";
import type { AiBusinessExecutionResource } from "./execution-resources.js";
import type { AiBusinessExecutionKpi } from "./execution-kpis.js";
import type { AiBusinessExecutionRisk } from "./execution-risks.js";
import type { AiBusinessExecutionRollbackPlan } from "./execution-rollbacks.js";

/**
 * Frozen business execution attached to pipeline state.
 * Safe metadata only — never carries records, emails, tokens, or secrets.
 * Actual execution must go through Tool Execution stages only.
 */
export interface AiBusinessExecution {
  readonly plan: AiBusinessExecutionPlan;
  readonly timeline: AiBusinessExecutionTimeline;
  readonly resources: readonly AiBusinessExecutionResource[];
  readonly kpis: readonly AiBusinessExecutionKpi[];
  readonly risks: readonly AiBusinessExecutionRisk[];
  readonly rollback: AiBusinessExecutionRollbackPlan;
  readonly confidence: number;
  readonly summary: string;
  readonly notes: readonly string[];
}
