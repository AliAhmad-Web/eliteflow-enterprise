/**
 * Enterprise AI Agent contract.
 * Agents specialize behavior without bypassing policy, context, or tools.
 */

export type AiAgentType =
  | "chat"
  | "analysis"
  | "document"
  | "workflow"
  | "custom";

export interface AiAgentMemoryPreferences {
  /** Hint only — Policy Stage remains authoritative. */
  readonly historyEnabled?: boolean | null;
  readonly maxHistoryMessages?: number | null;
}

export interface AiAgentExecutionHints {
  readonly streamingPreferred?: boolean | null;
  readonly maxTools?: number | null;
  /** Higher wins during soft matching. */
  readonly priority?: number;
}

/**
 * Registered agent definition (immutable once registered).
 */
export interface AiAgentDefinition {
  readonly id: string;
  readonly type: AiAgentType;
  readonly name: string;
  readonly description?: string;
  readonly systemInstructions?: string;
  readonly runtimeInstructions?: string;
  readonly preferredTools?: readonly string[];
  readonly preferredProvider?: string | null;
  readonly preferredModel?: string | null;
  readonly memoryPreferences?: AiAgentMemoryPreferences;
  readonly executionHints?: AiAgentExecutionHints;
  /** Matching modes (case-insensitive). null/empty = not mode-bound. */
  readonly modes?: readonly string[] | null;
  readonly modules?: readonly string[] | null;
  readonly surfaces?: readonly string[] | null;
  /** When false, resolver ignores this agent. Default true. */
  readonly enabled?: boolean;
}

/**
 * Immutable resolved agent attached to pipeline state.
 */
export interface AiActiveAgent {
  readonly id: string;
  readonly type: AiAgentType;
  readonly name: string;
  readonly systemInstructions: string;
  readonly runtimeInstructions: string;
  readonly preferredTools: readonly string[];
  readonly preferredProvider: string | null;
  readonly preferredModel: string | null;
  readonly memoryPreferences: Readonly<AiAgentMemoryPreferences>;
  readonly executionHints: Readonly<AiAgentExecutionHints>;
  readonly resolutionReason: string;
  /** True when default Chat Agent was used as fallback. */
  readonly fallback: boolean;
}

export const DEFAULT_CHAT_AGENT_ID = "agent.chat";
