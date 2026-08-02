/**
 * Enterprise Tool Registry — internal centralized registration of AI tools.
 * Seeded from the static catalog. No remote/plugin loading.
 */

import {
  AI_TOOL_CATALOG,
  type AiToolDefinition,
} from "./tool-catalog.js";

/**
 * Registry entry wrapping an existing tool definition.
 * Does not modify AiToolDefinition.
 */
export interface AiToolRegistration {
  readonly definition: AiToolDefinition;
  /** When false, Discovery excludes this tool. */
  readonly enabled: boolean;
  /** When false, Discovery excludes this tool (unsupported in this runtime). */
  readonly supported: boolean;
}

function freezeRegistration(
  registration: AiToolRegistration,
): AiToolRegistration {
  return Object.freeze({
    definition: registration.definition,
    enabled: registration.enabled,
    supported: registration.supported,
  });
}

function seedFromStaticCatalog(): readonly AiToolRegistration[] {
  return AI_TOOL_CATALOG.map((definition) =>
    freezeRegistration({
      definition,
      enabled: true,
      supported: true,
    }),
  );
}

/**
 * In-memory Enterprise Tool Registry.
 * Immutable listings; internal seed/register only (no dynamic plugins).
 */
export class AiToolRegistry {
  private readonly byId = new Map<string, AiToolRegistration>();

  constructor(seed: readonly AiToolRegistration[] = seedFromStaticCatalog()) {
    for (const registration of seed) {
      this.byId.set(
        registration.definition.id,
        freezeRegistration(registration),
      );
    }
  }

  /** Internal upsert for tests / controlled seeding — not a plugin loader. */
  register(registration: AiToolRegistration): void {
    this.byId.set(
      registration.definition.id,
      freezeRegistration(registration),
    );
  }

  get(toolId: string): AiToolRegistration | undefined {
    return this.byId.get(toolId);
  }

  /** Immutable snapshot of all registrations. */
  list(): readonly AiToolRegistration[] {
    return Object.freeze([...this.byId.values()]);
  }
}

/** Process-wide Enterprise Tool Registry (seeded from AI_TOOL_CATALOG). */
export const enterpriseToolRegistry = new AiToolRegistry();
