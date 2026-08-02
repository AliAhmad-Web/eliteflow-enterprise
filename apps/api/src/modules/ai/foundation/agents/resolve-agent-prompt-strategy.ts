/**
 * Agent Prompt Strategy Resolver.
 * Resolves strategy from the active agent, merges with defaults, returns immutable strategy.
 */

import type { AiActiveAgent } from "./ai-agent.js";
import type { AiAgentContext } from "./ai-agent-context.js";
import type {
  AiAgentPromptStrategy,
  AiAgentPromptStrategyPartial,
} from "./ai-agent-prompt-strategy.js";
import {
  BUILTIN_PROMPT_STRATEGIES,
  DEFAULT_PROMPT_STRATEGY,
} from "./builtin-prompt-strategies.js";

export interface ResolveAgentPromptStrategyInput {
  readonly activeAgent?: AiActiveAgent | null;
  readonly agentContext?: AiAgentContext | null;
  /** Optional partial overrides (safe fields only). */
  readonly overrides?: AiAgentPromptStrategyPartial | null;
}

function mergeStrategy(
  base: AiAgentPromptStrategy,
  overrides?: AiAgentPromptStrategyPartial | null,
): AiAgentPromptStrategy {
  const merged: AiAgentPromptStrategy = {
    systemInstructions:
      overrides?.systemInstructions?.trim() || base.systemInstructions,
    runtimeInstructions:
      overrides?.runtimeInstructions?.trim() || base.runtimeInstructions,
    reasoningStyle: overrides?.reasoningStyle?.trim() || base.reasoningStyle,
    responseStyle: overrides?.responseStyle ?? base.responseStyle,
    answerFormat: overrides?.answerFormat ?? base.answerFormat,
    preferredTemperature:
      overrides?.preferredTemperature ?? base.preferredTemperature,
    preferredCreativity:
      overrides?.preferredCreativity ?? base.preferredCreativity,
    preferredDetailLevel:
      overrides?.preferredDetailLevel ?? base.preferredDetailLevel,
  };

  // Prefer agent-context reasoning when available and overrides omit it.
  return Object.freeze(merged);
}

/**
 * Resolve an immutable prompt strategy for the active agent.
 * Falls back to the default strategy when no agent match exists.
 */
export function resolveAgentPromptStrategy(
  input: ResolveAgentPromptStrategyInput,
): AiAgentPromptStrategy {
  const agentType = input.activeAgent?.type;
  const builtin =
    agentType && agentType !== "custom"
      ? BUILTIN_PROMPT_STRATEGIES[agentType]
      : undefined;

  const base = mergeStrategy(DEFAULT_PROMPT_STRATEGY, builtin ?? null);

  // Align reasoning style with Agent Context when present (safe public label).
  const contextAligned: AiAgentPromptStrategyPartial = {
    ...(input.agentContext?.reasoningMode && !input.overrides?.reasoningStyle
      ? { reasoningStyle: input.agentContext.reasoningMode }
      : {}),
    ...(input.agentContext?.temperaturePreference &&
    !input.overrides?.preferredTemperature
      ? {
          preferredTemperature: input.agentContext.temperaturePreference,
        }
      : {}),
    ...(input.activeAgent?.systemInstructions?.trim() &&
    !input.overrides?.systemInstructions &&
    !builtin
      ? {
          systemInstructions: input.activeAgent.systemInstructions.trim(),
        }
      : {}),
  };

  return mergeStrategy(base, {
    ...contextAligned,
    ...(input.overrides ?? {}),
  });
}
