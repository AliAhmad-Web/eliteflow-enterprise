/**
 * Agent Context Builder.
 * Transforms the resolved agent + capabilities into an immutable Agent Context.
 */

import type { AiActiveAgent, AiAgentDefinition } from "./ai-agent.js";
import type { AiAgentContext } from "./ai-agent-context.js";
import type { AiToolExecution } from "../contracts/ai-tool-execution.js";
import { resolveAgentCapabilities } from "./resolve-agent-capabilities.js";
import {
  enterpriseAgentRegistry,
  type AiAgentRegistry,
} from "./agent-registry.js";

export interface BuildAgentContextInput {
  readonly activeAgent: AiActiveAgent;
  readonly toolExecutions?: readonly AiToolExecution[];
  readonly registry?: AiAgentRegistry;
  readonly definition?: AiAgentDefinition | null;
}

/**
 * Build an immutable Agent Context from the resolved active agent.
 */
export function buildAgentContext(
  input: BuildAgentContextInput,
): AiAgentContext {
  const registry = input.registry ?? enterpriseAgentRegistry;
  const definition =
    input.definition ?? registry.get(input.activeAgent.id) ?? null;

  const capabilities = resolveAgentCapabilities({
    activeAgent: input.activeAgent,
    definition,
    toolExecutions: input.toolExecutions,
  });

  return Object.freeze({
    agentId: input.activeAgent.id,
    name: input.activeAgent.name,
    description: definition?.description?.trim() ?? "",
    supportedModes: capabilities.supportedModes,
    supportedTools: capabilities.supportedTools,
    supportedEntityTypes: capabilities.supportedEntityTypes,
    allowedActions: capabilities.allowedActions,
    promptBehavior: capabilities.promptBehavior,
    reasoningMode: capabilities.reasoningMode,
    temperaturePreference: capabilities.temperaturePreference,
    systemInstructions: input.activeAgent.systemInstructions,
    runtimePreferences: Object.freeze({
      streamingPreferred:
        input.activeAgent.executionHints.streamingPreferred === true,
      maxTools: input.activeAgent.executionHints.maxTools ?? null,
      historyEnabled:
        input.activeAgent.memoryPreferences.historyEnabled ?? null,
    }),
    executionPolicy: capabilities.executionPolicy,
  });
}
