/**
 * Immutable Enterprise AI Action Plan model.
 * Planning metadata only — never executes.
 */

import type { AiActionPlanContainer } from "./action-plan.js";
import type { AiActionPrecondition } from "./action-preconditions.js";
import type { AiActionPostcondition } from "./action-postconditions.js";
import type { AiActionEstimation } from "./action-estimation.js";
import type {
  AiActionPlanRisk,
  AiActionPlanRiskLevel,
} from "./action-risk.js";
import type { AiActionPlanPriority } from "./action-priority.js";
import type { AiActionApproval } from "./action-approval.js";
import type { AiActionSafety } from "./action-safety.js";
import type { AiActionRollbackPlan } from "./action-rollback-plan.js";
import type { AiActionDryRun } from "./action-dry-run.js";
import type { AiActionValidation } from "./action-validation.js";

/**
 * Frozen action plan attached to pipeline state.
 * Safe metadata only — never carries records, tokens, or secrets.
 */
export interface AiActionPlan {
  readonly plan: AiActionPlanContainer;
  readonly preconditions: readonly AiActionPrecondition[];
  readonly postconditions: readonly AiActionPostcondition[];
  readonly estimation: AiActionEstimation;
  readonly risks: readonly AiActionPlanRisk[];
  readonly riskLevel: AiActionPlanRiskLevel;
  readonly priority: AiActionPlanPriority;
  readonly confidence: number;
  readonly approval: AiActionApproval;
  readonly safety: AiActionSafety;
  readonly rollback: AiActionRollbackPlan;
  readonly dryRun: AiActionDryRun;
  readonly validation: AiActionValidation;
  readonly summary: string;
  readonly notes: readonly string[];
}
