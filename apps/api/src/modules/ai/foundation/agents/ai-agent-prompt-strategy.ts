/**
 * Enterprise Agent Prompt Strategy contract.
 * Specializes prompt behavior while sharing the Prompt Engineering pipeline.
 */

import type { AiAgentTemperaturePreference } from "./ai-agent-context.js";

export type AiAgentResponseStyle =
  | "conversational"
  | "analytical"
  | "formal"
  | "action-oriented";

export type AiAgentAnswerFormat =
  | "prose"
  | "structured"
  | "bullets"
  | "steps";

export type AiAgentDetailLevel = "concise" | "standard" | "detailed";

export type AiAgentCreativityPreference = "low" | "moderate" | "high";

/**
 * Immutable prompt strategy resolved for the active agent.
 * Safe fields only — never carries tokens, secrets, or private config.
 */
export interface AiAgentPromptStrategy {
  readonly systemInstructions: string;
  readonly runtimeInstructions: string;
  readonly reasoningStyle: string;
  readonly responseStyle: AiAgentResponseStyle;
  readonly answerFormat: AiAgentAnswerFormat;
  readonly preferredTemperature: AiAgentTemperaturePreference;
  readonly preferredCreativity: AiAgentCreativityPreference;
  readonly preferredDetailLevel: AiAgentDetailLevel;
}

/** Partial overrides merged onto defaults by the Strategy Resolver. */
export type AiAgentPromptStrategyPartial = Partial<AiAgentPromptStrategy>;
