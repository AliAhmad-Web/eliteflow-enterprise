/**
 * Immutable Enterprise Agent Decision model.
 * Captures structured runtime behavior decisions — never executes tools,
 * never mutates prompts/history/providers.
 */

export type AiAgentDecisionReasoningLevel =
  | "lightweight"
  | "standard"
  | "deep";

export type AiAgentDecisionExecutionMode =
  | "respond-only"
  | "context-assisted"
  | "tool-assisted"
  | "workflow";

export type AiAgentDecisionResponseMode =
  | "lightweight"
  | "standard"
  | "detailed";

export type AiAgentDecisionPreferenceLevel =
  | "none"
  | "low"
  | "medium"
  | "high";

export type AiAgentDecisionStreamingPreference =
  | "avoid"
  | "neutral"
  | "preferred";

/**
 * Frozen decision attached to pipeline state.
 * Safe fields only — never carries tokens, secrets, or internal ids.
 */
export interface AiAgentDecision {
  readonly reasoningLevel: AiAgentDecisionReasoningLevel;
  readonly executionMode: AiAgentDecisionExecutionMode;
  readonly responseMode: AiAgentDecisionResponseMode;
  readonly toolPreference: AiAgentDecisionPreferenceLevel;
  readonly businessContextPreference: AiAgentDecisionPreferenceLevel;
  readonly memoryPreference: AiAgentDecisionPreferenceLevel;
  readonly documentPreference: AiAgentDecisionPreferenceLevel;
  readonly streamingPreference: AiAgentDecisionStreamingPreference;
  /** 0–1 confidence in this decision. */
  readonly confidenceScore: number;
  /** Safe human-readable rationale (no secrets / ids). */
  readonly decisionReason: string;
}
