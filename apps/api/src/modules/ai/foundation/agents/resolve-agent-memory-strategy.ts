/**
 * Agent Memory Strategy Resolver.
 * Resolves strategy from the active agent, merges with defaults, returns immutable strategy.
 */

import type { AiActiveAgent } from "./ai-agent.js";
import type { AiAgentContext } from "./ai-agent-context.js";
import type {
  AiAgentHistoryDepth,
  AiAgentMemoryStrategy,
  AiAgentMemoryStrategyPartial,
} from "./ai-agent-memory-strategy.js";
import {
  BUILTIN_MEMORY_STRATEGIES,
  DEFAULT_MEMORY_STRATEGY,
} from "./builtin-memory-strategies.js";

export interface ResolveAgentMemoryStrategyInput {
  readonly activeAgent?: AiActiveAgent | null;
  readonly agentContext?: AiAgentContext | null;
  /** Optional partial overrides (safe fields only). */
  readonly overrides?: AiAgentMemoryStrategyPartial | null;
}

function depthFromMaxMessages(
  maxHistoryMessages: number | null | undefined,
): AiAgentHistoryDepth | undefined {
  if (maxHistoryMessages == null || maxHistoryMessages <= 0) return undefined;
  if (maxHistoryMessages <= 16) return "short";
  if (maxHistoryMessages <= 48) return "medium";
  if (maxHistoryMessages <= 96) return "long";
  return "full";
}

function mergeStrategy(
  base: AiAgentMemoryStrategy,
  overrides?: AiAgentMemoryStrategyPartial | null,
): AiAgentMemoryStrategy {
  const summarizeThreshold =
    overrides?.summarizeThreshold != null &&
    Number.isFinite(overrides.summarizeThreshold) &&
    overrides.summarizeThreshold > 0
      ? Math.floor(overrides.summarizeThreshold)
      : base.summarizeThreshold;

  return Object.freeze({
    memoryMode: overrides?.memoryMode ?? base.memoryMode,
    historyDepth: overrides?.historyDepth ?? base.historyDepth,
    summarizeThreshold,
    retainSystemMessages:
      overrides?.retainSystemMessages ?? base.retainSystemMessages,
    retainRuntimeMessages:
      overrides?.retainRuntimeMessages ?? base.retainRuntimeMessages,
    retainToolResults: overrides?.retainToolResults ?? base.retainToolResults,
    retainBusinessContext:
      overrides?.retainBusinessContext ?? base.retainBusinessContext,
    privacyBehavior: overrides?.privacyBehavior ?? base.privacyBehavior,
    contextWindowPreference:
      overrides?.contextWindowPreference ?? base.contextWindowPreference,
  });
}

/**
 * Resolve an immutable memory strategy for the active agent.
 * Falls back to the default strategy when no agent match exists.
 */
export function resolveAgentMemoryStrategy(
  input: ResolveAgentMemoryStrategyInput,
): AiAgentMemoryStrategy {
  const agentType = input.activeAgent?.type;
  const builtin =
    agentType && agentType !== "custom"
      ? BUILTIN_MEMORY_STRATEGIES[agentType]
      : undefined;

  const base = mergeStrategy(DEFAULT_MEMORY_STRATEGY, builtin ?? null);

  const historyFromPrefs = depthFromMaxMessages(
    input.activeAgent?.memoryPreferences?.maxHistoryMessages,
  );

  const contextAligned: AiAgentMemoryStrategyPartial = {
    ...(historyFromPrefs && !input.overrides?.historyDepth
      ? { historyDepth: historyFromPrefs }
      : {}),
    ...(input.agentContext?.runtimePreferences.historyEnabled === false &&
    !input.overrides?.memoryMode
      ? { memoryMode: "minimal" as const, historyDepth: "short" as const }
      : {}),
  };

  return mergeStrategy(base, {
    ...contextAligned,
    ...(input.overrides ?? {}),
  });
}
