/**
 * Enterprise AI Action Framework — resolved active action contract.
 * Actions specialize metadata without executing or calling services.
 */

import type { AiActionCategory } from "./action-definition.js";

/**
 * Immutable resolved action attached to pipeline state.
 */
export interface AiActiveAction {
  readonly id: string;
  readonly category: AiActionCategory;
  readonly name: string;
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly resolutionReason: string;
  /** True when Generic Action was used as fallback. */
  readonly fallback: boolean;
  readonly confidence: number;
}

export const DEFAULT_GENERIC_ACTION_ID = "action.generic";
