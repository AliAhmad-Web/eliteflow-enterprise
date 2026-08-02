/**
 * Agent Decision Resolver.
 * Derives immutable runtime decisions from agent + strategy signals.
 * Never executes tools, mutates prompts, history, or providers.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiActiveAgent, AiAgentType } from "./ai-agent.js";
import type { AiAgentContext } from "./ai-agent-context.js";
import type { AiAgentPromptStrategy } from "./ai-agent-prompt-strategy.js";
import type { AiAgentMemoryStrategy } from "./ai-agent-memory-strategy.js";
import type {
  AiAgentDecision,
  AiAgentDecisionExecutionMode,
  AiAgentDecisionPreferenceLevel,
  AiAgentDecisionReasoningLevel,
  AiAgentDecisionResponseMode,
  AiAgentDecisionStreamingPreference,
} from "./ai-agent-decision.js";

export interface ResolveAgentDecisionInput {
  readonly activeAgent?: AiActiveAgent | null;
  readonly agentContext?: AiAgentContext | null;
  readonly agentPromptStrategy?: AiAgentPromptStrategy | null;
  readonly agentMemoryStrategy?: AiAgentMemoryStrategy | null;
  readonly activeContext?: AiActiveContext | null;
}

interface DecisionTemplate {
  readonly reasoningLevel: AiAgentDecisionReasoningLevel;
  readonly executionMode: AiAgentDecisionExecutionMode;
  readonly responseMode: AiAgentDecisionResponseMode;
  readonly toolPreference: AiAgentDecisionPreferenceLevel;
  readonly businessContextPreference: AiAgentDecisionPreferenceLevel;
  readonly memoryPreference: AiAgentDecisionPreferenceLevel;
  readonly documentPreference: AiAgentDecisionPreferenceLevel;
  readonly streamingPreference: AiAgentDecisionStreamingPreference;
  readonly reason: string;
}

const TYPE_TEMPLATES: Readonly<
  Record<Exclude<AiAgentType, "custom">, DecisionTemplate>
> = Object.freeze({
  chat: Object.freeze({
    reasoningLevel: "lightweight",
    executionMode: "respond-only",
    responseMode: "lightweight",
    toolPreference: "low",
    businessContextPreference: "medium",
    memoryPreference: "medium",
    documentPreference: "low",
    streamingPreference: "preferred",
    reason: "Chat agent: conversational reply with light tooling",
  }),
  analysis: Object.freeze({
    reasoningLevel: "deep",
    executionMode: "tool-assisted",
    responseMode: "detailed",
    toolPreference: "high",
    businessContextPreference: "high",
    memoryPreference: "high",
    documentPreference: "medium",
    streamingPreference: "neutral",
    reason: "Analysis agent: deep reasoning with tool and business context",
  }),
  document: Object.freeze({
    reasoningLevel: "standard",
    executionMode: "context-assisted",
    responseMode: "detailed",
    toolPreference: "medium",
    businessContextPreference: "medium",
    memoryPreference: "medium",
    documentPreference: "high",
    streamingPreference: "preferred",
    reason: "Document agent: prefer document context and structured drafting",
  }),
  workflow: Object.freeze({
    reasoningLevel: "standard",
    executionMode: "workflow",
    responseMode: "standard",
    toolPreference: "high",
    businessContextPreference: "medium",
    memoryPreference: "low",
    documentPreference: "low",
    streamingPreference: "avoid",
    reason: "Workflow agent: action-oriented tool use with short memory",
  }),
});

const DEFAULT_TEMPLATE: DecisionTemplate = Object.freeze({
  reasoningLevel: "standard",
  executionMode: "respond-only",
  responseMode: "standard",
  toolPreference: "low",
  businessContextPreference: "medium",
  memoryPreference: "medium",
  documentPreference: "low",
  streamingPreference: "neutral",
  reason: "Default agent decision",
});

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

function elevatePreference(
  current: AiAgentDecisionPreferenceLevel,
): AiAgentDecisionPreferenceLevel {
  switch (current) {
    case "none":
      return "low";
    case "low":
      return "medium";
    case "medium":
      return "high";
    case "high":
      return "high";
    default: {
      const _exhaustive: never = current;
      return _exhaustive;
    }
  }
}

function reducePreference(
  current: AiAgentDecisionPreferenceLevel,
): AiAgentDecisionPreferenceLevel {
  switch (current) {
    case "high":
      return "medium";
    case "medium":
      return "low";
    case "low":
      return "none";
    case "none":
      return "none";
    default: {
      const _exhaustive: never = current;
      return _exhaustive;
    }
  }
}

function memoryPreferenceFromStrategy(
  strategy: AiAgentMemoryStrategy | null | undefined,
  fallback: AiAgentDecisionPreferenceLevel,
): AiAgentDecisionPreferenceLevel {
  if (!strategy) return fallback;
  switch (strategy.historyDepth) {
    case "short":
      return "low";
    case "medium":
      return "medium";
    case "long":
    case "full":
      return "high";
    default: {
      const _exhaustive: never = strategy.historyDepth;
      return _exhaustive;
    }
  }
}

function reasoningFromSignals(
  base: AiAgentDecisionReasoningLevel,
  agentContext?: AiAgentContext | null,
  promptStrategy?: AiAgentPromptStrategy | null,
): AiAgentDecisionReasoningLevel {
  if (
    agentContext?.reasoningMode === "deep-analysis" ||
    promptStrategy?.preferredDetailLevel === "detailed" ||
    /deep/i.test(promptStrategy?.reasoningStyle ?? "")
  ) {
    return "deep";
  }
  if (
    promptStrategy?.preferredDetailLevel === "concise" ||
    agentContext?.promptBehavior === "dialogue"
  ) {
    return base === "deep" ? "standard" : "lightweight";
  }
  return base;
}

function responseModeFromSignals(
  base: AiAgentDecisionResponseMode,
  promptStrategy?: AiAgentPromptStrategy | null,
): AiAgentDecisionResponseMode {
  const detailLevel = promptStrategy?.preferredDetailLevel;
  switch (detailLevel) {
    case "concise":
      return "lightweight";
    case "detailed":
      return "detailed";
    case "standard":
      return "standard";
    case undefined:
      return base;
    default: {
      const _exhaustive: never = detailLevel;
      return _exhaustive;
    }
  }
}

function streamingFromSignals(
  base: AiAgentDecisionStreamingPreference,
  activeAgent?: AiActiveAgent | null,
  agentContext?: AiAgentContext | null,
): AiAgentDecisionStreamingPreference {
  const preferred =
    agentContext?.runtimePreferences.streamingPreferred === true ||
    activeAgent?.executionHints.streamingPreferred === true;
  const avoided =
    agentContext?.runtimePreferences.streamingPreferred === false ||
    activeAgent?.executionHints.streamingPreferred === false;

  if (preferred) return "preferred";
  if (avoided) return "avoid";
  return base;
}

function executionModeFromSignals(
  base: AiAgentDecisionExecutionMode,
  toolPreference: AiAgentDecisionPreferenceLevel,
  agentContext?: AiAgentContext | null,
): AiAgentDecisionExecutionMode {
  if (agentContext?.executionPolicy === "tool-forward" || toolPreference === "high") {
    return base === "workflow" ? "workflow" : "tool-assisted";
  }
  if (agentContext?.executionPolicy === "conservative" || toolPreference === "none") {
    return "respond-only";
  }
  if (toolPreference === "low") {
    return base === "respond-only" ? "respond-only" : "context-assisted";
  }
  return base;
}

function hasDocumentSignals(activeContext?: AiActiveContext | null): boolean {
  if (!activeContext) return false;
  if (activeContext.module?.toLowerCase() === "documents") return true;
  if (activeContext.surface === "DOCUMENTS") return true;
  return activeContext.entities.some(
    (entity) => entity.type.toLowerCase() === "document",
  );
}

function hasBusinessSignals(activeContext?: AiActiveContext | null): boolean {
  if (!activeContext) return false;
  if (activeContext.snippets.length > 0) return true;
  if (activeContext.primaryEntity) return true;
  if (activeContext.entities.length > 0) return true;
  return Boolean(activeContext.ambientText?.trim());
}

function computeConfidence(input: ResolveAgentDecisionInput): number {
  let score = 0.45;
  if (input.activeAgent) score += 0.2;
  if (input.agentContext) score += 0.12;
  if (input.agentPromptStrategy) score += 0.08;
  if (input.agentMemoryStrategy) score += 0.08;
  if (input.activeContext) score += 0.07;
  if (input.activeAgent && !input.activeAgent.fallback) score += 0.05;
  return clampConfidence(score);
}

function sanitizeReason(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, 160);
}

/**
 * Resolve an immutable agent decision for the current pipeline state.
 * Decisions guide later stages; this function never executes tools.
 */
export function resolveAgentDecision(
  input: ResolveAgentDecisionInput,
): AiAgentDecision {
  const agentType = input.activeAgent?.type;
  const template =
    agentType && agentType !== "custom"
      ? TYPE_TEMPLATES[agentType]
      : DEFAULT_TEMPLATE;

  let toolPreference = template.toolPreference;
  let businessContextPreference = template.businessContextPreference;
  let documentPreference = template.documentPreference;
  let memoryPreference = memoryPreferenceFromStrategy(
    input.agentMemoryStrategy,
    template.memoryPreference,
  );

  if (
    input.agentContext?.executionPolicy === "tool-forward" ||
    (input.activeAgent?.preferredTools?.length ?? 0) > 0
  ) {
    toolPreference = elevatePreference(toolPreference);
  }
  if (input.agentContext?.executionPolicy === "conservative") {
    toolPreference = reducePreference(toolPreference);
  }

  if (input.agentMemoryStrategy?.retainBusinessContext === false) {
    businessContextPreference = reducePreference(businessContextPreference);
  } else if (hasBusinessSignals(input.activeContext)) {
    businessContextPreference = elevatePreference(businessContextPreference);
  }

  if (
    input.agentContext?.promptBehavior === "document" ||
    input.agentMemoryStrategy?.memoryMode === "document-focused" ||
    hasDocumentSignals(input.activeContext)
  ) {
    documentPreference = elevatePreference(documentPreference);
  }

  if (input.agentMemoryStrategy?.memoryMode === "minimal") {
    memoryPreference = "low";
  }

  const reasoningLevel = reasoningFromSignals(
    template.reasoningLevel,
    input.agentContext,
    input.agentPromptStrategy,
  );
  const responseMode = responseModeFromSignals(
    template.responseMode,
    input.agentPromptStrategy,
  );
  const streamingPreference = streamingFromSignals(
    template.streamingPreference,
    input.activeAgent,
    input.agentContext,
  );
  const executionMode = executionModeFromSignals(
    template.executionMode,
    toolPreference,
    input.agentContext,
  );

  const reasonParts = [
    template.reason,
    reasoningLevel === "deep" ? "deeper reasoning selected" : null,
    responseMode === "lightweight" ? "lightweight response sufficient" : null,
    toolPreference === "high" || toolPreference === "medium"
      ? "tools eligible for later routing"
      : "tools deprioritized",
    businessContextPreference === "none" || businessContextPreference === "low"
      ? "business context optional"
      : "business context preferred",
    documentPreference === "high" ? "document context preferred" : null,
    streamingPreference === "preferred"
      ? "streaming recommended"
      : streamingPreference === "avoid"
        ? "streaming discouraged"
        : null,
  ].filter((part): part is string => Boolean(part));

  return Object.freeze({
    reasoningLevel,
    executionMode,
    responseMode,
    toolPreference,
    businessContextPreference,
    memoryPreference,
    documentPreference,
    streamingPreference,
    confidenceScore: computeConfidence(input),
    decisionReason: sanitizeReason(reasonParts.join("; ")),
  });
}
