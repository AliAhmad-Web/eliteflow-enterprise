/**
 * Forgetting rules — mark memories for removal from active long-term set.
 */

import type { AiLongTermMemoryCategory } from "./long-term-memory-category.js";
import type { AiMemoryRetentionPolicy } from "./long-term-memory-retention.js";

export interface AiMemoryForgettingDecision {
  readonly forget: boolean;
  readonly reason: string;
}

export function decideMemoryForgetting(input: {
  readonly forgettingEnabled: boolean;
  readonly importance: number;
  readonly strength: number;
  readonly demoted: boolean;
  readonly category: AiLongTermMemoryCategory;
  readonly retention: AiMemoryRetentionPolicy;
}): AiMemoryForgettingDecision {
  if (!input.forgettingEnabled) {
    return Object.freeze({ forget: false, reason: "forgetting-disabled" });
  }
  if (input.retention.preserve) {
    return Object.freeze({ forget: false, reason: "retention-preserve" });
  }
  if (input.category === "preference" || input.category === "business") {
    return Object.freeze({ forget: false, reason: "protected-category" });
  }
  if (input.demoted && input.importance < 0.25 && input.strength < 0.3) {
    return Object.freeze({ forget: true, reason: "demoted-low-value" });
  }
  if (input.category === "ephemeral" && input.strength < 0.4) {
    return Object.freeze({ forget: true, reason: "ephemeral-decay" });
  }
  if (input.retention.kind === "ephemeral" && input.importance < 0.35) {
    return Object.freeze({ forget: true, reason: "ephemeral-retention" });
  }
  return Object.freeze({ forget: false, reason: "retain" });
}
