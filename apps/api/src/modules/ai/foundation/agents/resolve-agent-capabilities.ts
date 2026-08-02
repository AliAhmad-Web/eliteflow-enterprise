/**
 * Agent Capability Resolver.
 * Derives supported tools, actions, entities, reasoning, and execution policy.
 */

import type { AiActiveAgent, AiAgentDefinition, AiAgentType } from "./ai-agent.js";
import type {
  AiAgentExecutionPolicy,
  AiAgentPromptBehavior,
  AiAgentReasoningMode,
  AiAgentTemperaturePreference,
} from "./ai-agent-context.js";
import type { AiToolExecution } from "../contracts/ai-tool-execution.js";

export interface AiAgentCapabilities {
  readonly supportedTools: readonly string[];
  readonly allowedActions: readonly string[];
  readonly supportedEntityTypes: readonly string[];
  readonly supportedModes: readonly string[];
  readonly reasoningMode: AiAgentReasoningMode;
  readonly temperaturePreference: AiAgentTemperaturePreference;
  readonly promptBehavior: AiAgentPromptBehavior;
  readonly executionPolicy: AiAgentExecutionPolicy;
}

export interface ResolveAgentCapabilitiesInput {
  readonly activeAgent: AiActiveAgent;
  readonly definition?: AiAgentDefinition | null;
  /** Eligible / executed tools from Tool stages (never bypassed). */
  readonly toolExecutions?: readonly AiToolExecution[];
}

const TYPE_CAPABILITIES: Readonly<
  Record<
    AiAgentType,
    {
      actions: readonly string[];
      entities: readonly string[];
      reasoning: AiAgentReasoningMode;
      temperature: AiAgentTemperaturePreference;
      promptBehavior: AiAgentPromptBehavior;
      executionPolicy: AiAgentExecutionPolicy;
    }
  >
> = {
  chat: {
    actions: ["respond", "clarify", "summarize"],
    entities: [],
    reasoning: "conversational",
    temperature: "balanced",
    promptBehavior: "dialogue",
    executionPolicy: "conservative",
  },
  analysis: {
    actions: ["summarize", "analyze", "compare"],
    entities: ["project", "report"],
    reasoning: "deep-analysis",
    temperature: "low",
    promptBehavior: "analysis",
    executionPolicy: "standard",
  },
  document: {
    actions: ["summarize", "draft", "organize"],
    entities: ["document"],
    reasoning: "structured",
    temperature: "balanced",
    promptBehavior: "document",
    executionPolicy: "standard",
  },
  workflow: {
    actions: ["plan", "schedule", "assign", "notify"],
    entities: ["task", "client", "calendar"],
    reasoning: "actionable",
    temperature: "low",
    promptBehavior: "workflow",
    executionPolicy: "tool-forward",
  },
  custom: {
    actions: ["respond"],
    entities: [],
    reasoning: "conversational",
    temperature: "balanced",
    promptBehavior: "dialogue",
    executionPolicy: "standard",
  },
};

function eligibleToolIds(
  executions: readonly AiToolExecution[] | undefined,
): Set<string> | null {
  if (!executions || executions.length === 0) return null;
  const ids = new Set<string>();
  for (const item of executions) {
    switch (item.status) {
      case "eligible":
      case "succeeded":
      case "failed":
      case "running":
      case "pending_confirmation":
        ids.add(item.toolId);
        break;
      case "skipped":
        break;
      default: {
        const _exhaustive: never = item.status;
        void _exhaustive;
        break;
      }
    }
  }
  return ids;
}

/**
 * Resolve normalized capabilities for the active agent.
 * Tool support is intersected with Tool Eligibility results when available.
 */
export function resolveAgentCapabilities(
  input: ResolveAgentCapabilitiesInput,
): AiAgentCapabilities {
  const { activeAgent, definition } = input;
  const typeCaps = TYPE_CAPABILITIES[activeAgent.type] ?? TYPE_CAPABILITIES.custom;

  const preferred = [
    ...(activeAgent.preferredTools ?? []),
    ...(definition?.preferredTools ?? []),
  ];
  const preferredUnique = [...new Set(preferred)];

  const eligible = eligibleToolIds(input.toolExecutions);
  const supportedTools =
    eligible && preferredUnique.length > 0
      ? preferredUnique.filter((toolId) => eligible.has(toolId))
      : preferredUnique;

  const maxTools = activeAgent.executionHints.maxTools;
  const cappedTools =
    typeof maxTools === "number" && maxTools > 0
      ? supportedTools.slice(0, maxTools)
      : supportedTools;

  const modes =
    definition?.modes && definition.modes.length > 0
      ? definition.modes.map((mode) => mode.toUpperCase())
      : [];

  return Object.freeze({
    supportedTools: Object.freeze([...cappedTools]),
    allowedActions: Object.freeze([...typeCaps.actions]),
    supportedEntityTypes: Object.freeze([...typeCaps.entities]),
    supportedModes: Object.freeze([...modes]),
    reasoningMode: typeCaps.reasoning,
    temperaturePreference: typeCaps.temperature,
    promptBehavior: typeCaps.promptBehavior,
    executionPolicy: typeCaps.executionPolicy,
  });
}
