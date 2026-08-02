/**
 * Enterprise Agent Memory Strategy contract.
 * Controls how conversation memory is prepared before Prompt Engineering.
 * Safe fields only — never carries tokens, secrets, private memory, or internal ids.
 */

export type AiAgentMemoryMode =
  | "conversational"
  | "reasoning-preserving"
  | "document-focused"
  | "action-retaining"
  | "minimal";

export type AiAgentHistoryDepth = "short" | "medium" | "long" | "full";

export type AiAgentMemoryPrivacyBehavior =
  | "strict"
  | "standard"
  | "permissive";

export type AiAgentContextWindowPreference =
  | "compact"
  | "balanced"
  | "extended";

/**
 * Immutable memory strategy resolved for the active agent.
 */
export interface AiAgentMemoryStrategy {
  readonly memoryMode: AiAgentMemoryMode;
  readonly historyDepth: AiAgentHistoryDepth;
  /** Message count above which older turns are compacted (not LLM-summarized). */
  readonly summarizeThreshold: number;
  readonly retainSystemMessages: boolean;
  readonly retainRuntimeMessages: boolean;
  readonly retainToolResults: boolean;
  readonly retainBusinessContext: boolean;
  readonly privacyBehavior: AiAgentMemoryPrivacyBehavior;
  readonly contextWindowPreference: AiAgentContextWindowPreference;
}

/** Partial overrides merged onto defaults by the Memory Strategy Resolver. */
export type AiAgentMemoryStrategyPartial = Partial<AiAgentMemoryStrategy>;
