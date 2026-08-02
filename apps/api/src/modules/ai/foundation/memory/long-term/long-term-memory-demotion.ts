/**
 * Demotion rules — lower low-value or aging memories.
 */

import type { AiLongTermMemoryCategory } from "./long-term-memory-category.js";

export interface AiMemoryDemotionDecision {
  readonly demote: boolean;
  readonly reason: string;
}

export function decideMemoryDemotion(input: {
  readonly importance: number;
  readonly strength: number;
  readonly relevance: number;
  readonly category: AiLongTermMemoryCategory;
  readonly promoted: boolean;
}): AiMemoryDemotionDecision {
  if (input.promoted && (input.category === "preference" || input.category === "business")) {
    return Object.freeze({ demote: false, reason: "protected" });
  }
  if (input.category === "ephemeral") {
    return Object.freeze({ demote: true, reason: "ephemeral" });
  }
  if (input.importance < 0.3 && input.strength < 0.35) {
    return Object.freeze({ demote: true, reason: "low-value" });
  }
  if (input.relevance < 0.2 && input.strength < 0.4) {
    return Object.freeze({ demote: true, reason: "low-relevance" });
  }
  return Object.freeze({ demote: false, reason: "stable" });
}
