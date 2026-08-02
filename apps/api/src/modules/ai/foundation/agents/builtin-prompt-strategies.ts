/**
 * Built-in Agent Prompt Strategies (Chat, Analysis, Document, Workflow).
 */

import type { AiAgentType } from "./ai-agent.js";
import type { AiAgentPromptStrategy } from "./ai-agent-prompt-strategy.js";

export const DEFAULT_PROMPT_STRATEGY: AiAgentPromptStrategy = Object.freeze({
  systemInstructions:
    "Respond clearly and helpfully. Prefer accurate, concise answers.",
  runtimeInstructions:
    "Use a balanced tone. Prefer clarity over verbosity.",
  reasoningStyle: "conversational",
  responseStyle: "conversational",
  answerFormat: "prose",
  preferredTemperature: "balanced",
  preferredCreativity: "moderate",
  preferredDetailLevel: "standard",
});

export const CHAT_PROMPT_STRATEGY: AiAgentPromptStrategy = Object.freeze({
  systemInstructions:
    "You are the EliteFlow Chat Agent. Prefer clear, concise, helpful dialogue.",
  runtimeInstructions:
    "Keep replies conversational. Ask clarifying questions when the request is ambiguous.",
  reasoningStyle: "conversational",
  responseStyle: "conversational",
  answerFormat: "prose",
  preferredTemperature: "balanced",
  preferredCreativity: "moderate",
  preferredDetailLevel: "concise",
});

export const ANALYSIS_PROMPT_STRATEGY: AiAgentPromptStrategy = Object.freeze({
  systemInstructions:
    "You are the EliteFlow Analysis Agent. Emphasize structured findings, evidence, and comparisons.",
  runtimeInstructions:
    "Lead with key findings, then supporting detail. Call out uncertainty explicitly.",
  reasoningStyle: "deep-analysis",
  responseStyle: "analytical",
  answerFormat: "structured",
  preferredTemperature: "low",
  preferredCreativity: "low",
  preferredDetailLevel: "detailed",
});

export const DOCUMENT_PROMPT_STRATEGY: AiAgentPromptStrategy = Object.freeze({
  systemInstructions:
    "You are the EliteFlow Document Agent. Prefer clear document structure and readable prose.",
  runtimeInstructions:
    "Organize content with headings or sections when helpful. Keep language formal and precise.",
  reasoningStyle: "structured",
  responseStyle: "formal",
  answerFormat: "structured",
  preferredTemperature: "balanced",
  preferredCreativity: "moderate",
  preferredDetailLevel: "standard",
});

export const WORKFLOW_PROMPT_STRATEGY: AiAgentPromptStrategy = Object.freeze({
  systemInstructions:
    "You are the EliteFlow Workflow Agent. Prefer actionable next steps and operational clarity.",
  runtimeInstructions:
    "Provide concrete actions, owners when known, and sequencing. Prefer checklists when useful.",
  reasoningStyle: "actionable",
  responseStyle: "action-oriented",
  answerFormat: "steps",
  preferredTemperature: "low",
  preferredCreativity: "low",
  preferredDetailLevel: "standard",
});

export const BUILTIN_PROMPT_STRATEGIES: Readonly<
  Record<Exclude<AiAgentType, "custom">, AiAgentPromptStrategy>
> = Object.freeze({
  chat: CHAT_PROMPT_STRATEGY,
  analysis: ANALYSIS_PROMPT_STRATEGY,
  document: DOCUMENT_PROMPT_STRATEGY,
  workflow: WORKFLOW_PROMPT_STRATEGY,
});
