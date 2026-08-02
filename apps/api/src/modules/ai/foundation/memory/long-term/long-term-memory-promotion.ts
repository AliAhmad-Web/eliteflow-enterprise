/**
 * Promotion rules — elevate important memories to long-term status.
 */

import type { AiLongTermMemoryCategory } from "./long-term-memory-category.js";

export interface AiMemoryPromotionDecision {
  readonly promote: boolean;
  readonly reason: string;
}

export function decideMemoryPromotion(input: {
  readonly importance: number;
  readonly strength: number;
  readonly category: AiLongTermMemoryCategory;
}): AiMemoryPromotionDecision {
  if (input.category === "preference" || input.category === "business") {
    return Object.freeze({
      promote: true,
      reason: `preserve-${input.category}`,
    });
  }
  if (input.importance >= 0.7 && input.strength >= 0.55) {
    return Object.freeze({
      promote: true,
      reason: "high-importance",
    });
  }
  if (input.category === "knowledge" && input.importance >= 0.6) {
    return Object.freeze({
      promote: true,
      reason: "knowledge-threshold",
    });
  }
  return Object.freeze({
    promote: false,
    reason: "below-threshold",
  });
}
