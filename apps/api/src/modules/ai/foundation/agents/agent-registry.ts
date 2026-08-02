/**
 * Enterprise AI Agent Registry.
 * Central registration of specialized agents. No remote/plugin loading.
 */

import type { AiAgentDefinition } from "./ai-agent.js";
import { BUILTIN_AGENTS } from "./builtin-agents.js";

function freezeAgent(agent: AiAgentDefinition): AiAgentDefinition {
  return Object.freeze({
    ...agent,
    preferredTools: Object.freeze([...(agent.preferredTools ?? [])]),
    modes: agent.modes ? Object.freeze([...agent.modes]) : null,
    modules: agent.modules ? Object.freeze([...agent.modules]) : null,
    surfaces: agent.surfaces ? Object.freeze([...agent.surfaces]) : null,
    memoryPreferences: Object.freeze({ ...(agent.memoryPreferences ?? {}) }),
    executionHints: Object.freeze({ ...(agent.executionHints ?? {}) }),
    enabled: agent.enabled !== false,
  });
}

/**
 * In-memory Enterprise Agent Registry.
 */
export class AiAgentRegistry {
  private readonly byId = new Map<string, AiAgentDefinition>();

  constructor(seed: readonly AiAgentDefinition[] = BUILTIN_AGENTS) {
    for (const agent of seed) {
      this.byId.set(agent.id, freezeAgent(agent));
    }
  }

  /** Controlled upsert for tests / future custom agents — not a plugin loader. */
  register(agent: AiAgentDefinition): void {
    this.byId.set(agent.id, freezeAgent(agent));
  }

  get(agentId: string): AiAgentDefinition | undefined {
    return this.byId.get(agentId);
  }

  list(): readonly AiAgentDefinition[] {
    return Object.freeze([...this.byId.values()]);
  }

  listEnabled(): readonly AiAgentDefinition[] {
    return Object.freeze(
      [...this.byId.values()].filter((agent) => agent.enabled !== false),
    );
  }
}

/** Process-wide Enterprise Agent Registry (seeded with built-in agents). */
export const enterpriseAgentRegistry = new AiAgentRegistry();
