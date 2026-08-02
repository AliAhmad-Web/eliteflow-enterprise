/**
 * Enterprise AI Action Registry.
 * Central registration of action metadata. No remote loading, no execution.
 */

import type { AiActionDefinition } from "./action-definition.js";
import { BUILTIN_ACTIONS } from "./builtin-actions.js";

function freezeAction(action: AiActionDefinition): AiActionDefinition {
  return Object.freeze({
    ...action,
    capabilities: Object.freeze([...(action.capabilities ?? [])]),
    supportedEntities: Object.freeze([...(action.supportedEntities ?? [])]),
    supportedIntents: Object.freeze([...(action.supportedIntents ?? [])]),
    moduleKeys: action.moduleKeys
      ? Object.freeze([...action.moduleKeys])
      : null,
    preferredAgentTypes: action.preferredAgentTypes
      ? Object.freeze([...action.preferredAgentTypes])
      : null,
    surfaces: action.surfaces ? Object.freeze([...action.surfaces]) : null,
    enabled: action.enabled !== false,
  });
}

/**
 * In-memory Enterprise Action Registry.
 */
export class AiActionRegistry {
  private readonly byId = new Map<string, AiActionDefinition>();

  constructor(seed: readonly AiActionDefinition[] = BUILTIN_ACTIONS) {
    for (const action of seed) {
      this.byId.set(action.id, freezeAction(action));
    }
  }

  /** Controlled upsert for tests / future actions — not a plugin loader. */
  register(action: AiActionDefinition): void {
    this.byId.set(action.id, freezeAction(action));
  }

  get(actionId: string): AiActionDefinition | undefined {
    return this.byId.get(actionId);
  }

  list(): readonly AiActionDefinition[] {
    return Object.freeze([...this.byId.values()]);
  }

  listEnabled(): readonly AiActionDefinition[] {
    return Object.freeze(
      [...this.byId.values()].filter((action) => action.enabled !== false),
    );
  }
}

/** Process-wide Enterprise Action Registry (seeded with built-in actions). */
export const enterpriseActionRegistry = new AiActionRegistry();
