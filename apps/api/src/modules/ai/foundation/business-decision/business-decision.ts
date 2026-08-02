/**
 * Immutable Enterprise Business Decision model.
 * Structured decision over existing reasoning — never executes actions.
 */

import type { AiBusinessDecisionOption } from "./decision-options.js";
import type { AiBusinessDecisionPriority } from "./decision-priority.js";
import type { AiBusinessDecisionImpact } from "./decision-impact.js";
import type { AiBusinessDecisionRisk } from "./decision-risk.js";
import type { AiBusinessDecisionRecommendation } from "./decision-recommendation.js";

export type AiBusinessDecisionExecutionMode =
  | "advise-only"
  | "recommend"
  | "escalate";

/**
 * Safe execution metadata — never triggers tools or mutations.
 */
export interface AiBusinessDecisionExecutionMetadata {
  readonly mode: AiBusinessDecisionExecutionMode;
  readonly selectedOptionId: string | null;
  readonly requiresConfirmation: boolean;
  readonly actionable: boolean;
}

/**
 * Frozen business decision attached to pipeline state.
 * Safe fields only — never carries records, emails, tokens, or secrets.
 */
export interface AiBusinessDecision {
  readonly options: readonly AiBusinessDecisionOption[];
  readonly priority: AiBusinessDecisionPriority;
  readonly impact: AiBusinessDecisionImpact;
  readonly risk: AiBusinessDecisionRisk;
  readonly recommendation: AiBusinessDecisionRecommendation;
  readonly confidence: number;
  readonly reasoningSummary: string;
  readonly execution: AiBusinessDecisionExecutionMetadata;
  readonly notes: readonly string[];
}
