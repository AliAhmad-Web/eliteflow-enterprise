/**
 * Immutable Enterprise Agent Context model.
 * Exposes agent capabilities to Prompt Engineering without mutating user messages.
 */

export type AiAgentReasoningMode =
  | "conversational"
  | "structured"
  | "deep-analysis"
  | "actionable";

export type AiAgentTemperaturePreference =
  | "low"
  | "balanced"
  | "creative";

export type AiAgentExecutionPolicy =
  | "conservative"
  | "standard"
  | "tool-forward";

export type AiAgentPromptBehavior =
  | "dialogue"
  | "analysis"
  | "document"
  | "workflow";

export interface AiAgentRuntimePreferences {
  readonly streamingPreferred: boolean;
  readonly maxTools: number | null;
  readonly historyEnabled: boolean | null;
}

/**
 * Normalized runtime agent context — frozen once built.
 * Safe for PE consumption; runtime formatting must omit secrets / internal ids.
 */
export interface AiAgentContext {
  readonly agentId: string;
  readonly name: string;
  readonly description: string;
  readonly supportedModes: readonly string[];
  readonly supportedTools: readonly string[];
  readonly supportedEntityTypes: readonly string[];
  readonly allowedActions: readonly string[];
  readonly promptBehavior: AiAgentPromptBehavior;
  readonly reasoningMode: AiAgentReasoningMode;
  readonly temperaturePreference: AiAgentTemperaturePreference;
  readonly systemInstructions: string;
  readonly runtimePreferences: Readonly<AiAgentRuntimePreferences>;
  readonly executionPolicy: AiAgentExecutionPolicy;
}
