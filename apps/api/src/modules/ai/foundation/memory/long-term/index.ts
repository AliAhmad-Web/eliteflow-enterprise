/**
 * Enterprise Long-Term Memory Intelligence public exports.
 */

export type { AiLongTermMemoryCategory } from "./long-term-memory-category.js";
export {
  formatLongTermMemoryCategory,
  resolveLongTermMemoryCategory,
} from "./long-term-memory-category.js";

export type { AiLongTermMemoryPriority } from "./long-term-memory-priority.js";
export {
  formatLongTermMemoryPriority,
  resolveLongTermMemoryPriority,
} from "./long-term-memory-priority.js";

export { scoreMemoryImportance } from "./long-term-memory-importance.js";

export type {
  AiMemoryRetentionPolicy,
  AiMemoryRetentionPolicyKind,
} from "./long-term-memory-retention.js";
export {
  formatMemoryRetentionPolicyKind,
  resolveMemoryRetentionPolicy,
} from "./long-term-memory-retention.js";

export type { AiMemoryAgingResult } from "./long-term-memory-aging.js";
export { applyMemoryAging } from "./long-term-memory-aging.js";

export { scoreMemoryStrength } from "./long-term-memory-strength.js";
export { scoreMemoryRelevance } from "./long-term-memory-relevance.js";

export type { AiLongTermMemoryLifecycleState } from "./long-term-memory-lifecycle.js";
export {
  formatLongTermMemoryLifecycleState,
  resolveLifecycleState,
} from "./long-term-memory-lifecycle.js";

export type { AiMemoryPromotionDecision } from "./long-term-memory-promotion.js";
export { decideMemoryPromotion } from "./long-term-memory-promotion.js";

export type { AiMemoryDemotionDecision } from "./long-term-memory-demotion.js";
export { decideMemoryDemotion } from "./long-term-memory-demotion.js";

export type { AiMemoryForgettingDecision } from "./long-term-memory-forgetting.js";
export { decideMemoryForgetting } from "./long-term-memory-forgetting.js";

export type { AiLongTermMemoryEntry } from "./long-term-memory-entry.js";
export { freezeLongTermMemoryEntry } from "./long-term-memory-entry.js";

export type { AiLongTermMemoryProfile } from "./long-term-memory-profile.js";
export {
  buildLongTermMemoryProfile,
  emptyCategoryCounts,
} from "./long-term-memory-profile.js";

export type { AiLongTermMemory } from "./long-term-memory.js";

export type {
  AiConsolidationAction,
  AiConsolidationItem,
  AiMemoryConsolidation,
} from "./long-term-memory-consolidation.js";
export { consolidateLongTermMemories } from "./long-term-memory-consolidation.js";

export type { ResolveLongTermMemoryInput } from "./long-term-memory-engine.js";
export {
  resolveLongTermMemory,
  longTermMemoryEngine,
} from "./long-term-memory-engine.js";

export type {
  LongTermMemoryManagerResolveInput,
  LongTermMemoryManagerResult,
} from "./long-term-memory-manager.js";
export {
  AiLongTermMemoryManager,
  longTermMemoryManager,
} from "./long-term-memory-manager.js";

export { formatLongTermMemoryForRuntime } from "./long-term-memory-runtime.js";
