/**
 * Built-in Agent Memory Strategies (Chat, Analysis, Document, Workflow).
 */

import type { AiAgentType } from "./ai-agent.js";
import type { AiAgentMemoryStrategy } from "./ai-agent-memory-strategy.js";

export const DEFAULT_MEMORY_STRATEGY: AiAgentMemoryStrategy = Object.freeze({
  memoryMode: "conversational",
  historyDepth: "medium",
  summarizeThreshold: 40,
  retainSystemMessages: true,
  retainRuntimeMessages: true,
  retainToolResults: false,
  retainBusinessContext: true,
  privacyBehavior: "standard",
  contextWindowPreference: "balanced",
});

/** Chat Agent — medium history, conversational. */
export const CHAT_MEMORY_STRATEGY: AiAgentMemoryStrategy = Object.freeze({
  memoryMode: "conversational",
  historyDepth: "medium",
  summarizeThreshold: 36,
  retainSystemMessages: true,
  retainRuntimeMessages: true,
  retainToolResults: false,
  retainBusinessContext: true,
  privacyBehavior: "standard",
  contextWindowPreference: "balanced",
});

/** Analysis Agent — long history, preserve reasoning. */
export const ANALYSIS_MEMORY_STRATEGY: AiAgentMemoryStrategy = Object.freeze({
  memoryMode: "reasoning-preserving",
  historyDepth: "long",
  summarizeThreshold: 64,
  retainSystemMessages: true,
  retainRuntimeMessages: true,
  retainToolResults: true,
  retainBusinessContext: true,
  privacyBehavior: "standard",
  contextWindowPreference: "extended",
});

/** Document Agent — document-focused, retain summaries. */
export const DOCUMENT_MEMORY_STRATEGY: AiAgentMemoryStrategy = Object.freeze({
  memoryMode: "document-focused",
  historyDepth: "medium",
  summarizeThreshold: 48,
  retainSystemMessages: true,
  retainRuntimeMessages: false,
  retainToolResults: true,
  retainBusinessContext: true,
  privacyBehavior: "standard",
  contextWindowPreference: "balanced",
});

/** Workflow Agent — short history, retain actions. */
export const WORKFLOW_MEMORY_STRATEGY: AiAgentMemoryStrategy = Object.freeze({
  memoryMode: "action-retaining",
  historyDepth: "short",
  summarizeThreshold: 20,
  retainSystemMessages: false,
  retainRuntimeMessages: true,
  retainToolResults: true,
  retainBusinessContext: false,
  privacyBehavior: "strict",
  contextWindowPreference: "compact",
});

export const BUILTIN_MEMORY_STRATEGIES: Readonly<
  Record<Exclude<AiAgentType, "custom">, AiAgentMemoryStrategy>
> = Object.freeze({
  chat: CHAT_MEMORY_STRATEGY,
  analysis: ANALYSIS_MEMORY_STRATEGY,
  document: DOCUMENT_MEMORY_STRATEGY,
  workflow: WORKFLOW_MEMORY_STRATEGY,
});
