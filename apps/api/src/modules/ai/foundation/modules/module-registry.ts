/**
 * Enterprise Module Registry.
 * Central registration of module metadata. No remote loading, no business logic.
 */

import type { AiEnterpriseModuleDefinition } from "./module-definition.js";
import { BUILTIN_ENTERPRISE_MODULES } from "./builtin-modules.js";

function freezeModule(
  module: AiEnterpriseModuleDefinition,
): AiEnterpriseModuleDefinition {
  return Object.freeze({
    ...module,
    supportedActions: Object.freeze([...(module.supportedActions ?? [])]),
    supportedEntities: Object.freeze([...(module.supportedEntities ?? [])]),
    supportedQueries: Object.freeze([...(module.supportedQueries ?? [])]),
    permissions: Object.freeze([...(module.permissions ?? [])]),
    moduleKeys: module.moduleKeys
      ? Object.freeze([...module.moduleKeys])
      : null,
    surfaces: module.surfaces ? Object.freeze([...module.surfaces]) : null,
    preferredAgentTypes: module.preferredAgentTypes
      ? Object.freeze([...module.preferredAgentTypes])
      : null,
    enabled: module.enabled !== false,
  });
}

/**
 * In-memory Enterprise Module Registry.
 */
export class AiEnterpriseModuleRegistry {
  private readonly byId = new Map<string, AiEnterpriseModuleDefinition>();

  constructor(
    seed: readonly AiEnterpriseModuleDefinition[] = BUILTIN_ENTERPRISE_MODULES,
  ) {
    for (const module of seed) {
      this.byId.set(module.id, freezeModule(module));
    }
  }

  /** Controlled upsert for tests / future modules — not a plugin loader. */
  register(module: AiEnterpriseModuleDefinition): void {
    this.byId.set(module.id, freezeModule(module));
  }

  get(moduleId: string): AiEnterpriseModuleDefinition | undefined {
    return this.byId.get(moduleId);
  }

  list(): readonly AiEnterpriseModuleDefinition[] {
    return Object.freeze([...this.byId.values()]);
  }

  listEnabled(): readonly AiEnterpriseModuleDefinition[] {
    return Object.freeze(
      [...this.byId.values()].filter(
        (module) =>
          module.enabled !== false && module.availability !== "unavailable",
      ),
    );
  }
}

/** Process-wide Enterprise Module Registry (seeded with built-in placeholders). */
export const enterpriseModuleRegistry = new AiEnterpriseModuleRegistry();
