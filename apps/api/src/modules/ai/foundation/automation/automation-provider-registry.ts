/**
 * Automation Provider Registry.
 * Central registration of external automation engines.
 */

import type { AiAutomationProvider } from "./automation-provider.js";
import type { AiAutomationProviderDefinition } from "./automation-provider-definition.js";
import { n8nAutomationProvider } from "./n8n-provider.js";

function freezeDefinition(
  definition: AiAutomationProviderDefinition,
): AiAutomationProviderDefinition {
  return Object.freeze({ ...definition });
}

/**
 * In-memory Automation Provider Registry.
 */
export class AiAutomationProviderRegistry {
  private readonly byId = new Map<string, AiAutomationProvider>();

  constructor(seed: readonly AiAutomationProvider[] = [n8nAutomationProvider]) {
    for (const provider of seed) {
      this.register(provider);
    }
  }

  register(provider: AiAutomationProvider): void {
    this.byId.set(
      provider.definition.id,
      Object.freeze({
        ...provider,
        definition: freezeDefinition(provider.definition),
      }),
    );
  }

  get(providerId: string): AiAutomationProvider | undefined {
    return this.byId.get(providerId);
  }

  getByKind(
    kind: AiAutomationProviderDefinition["kind"],
  ): AiAutomationProvider | undefined {
    return [...this.byId.values()].find((p) => p.definition.kind === kind);
  }

  list(): readonly AiAutomationProvider[] {
    return Object.freeze([...this.byId.values()]);
  }

  listEnabled(): readonly AiAutomationProvider[] {
    return Object.freeze(
      [...this.byId.values()].filter((p) => p.definition.enabled !== false),
    );
  }

  listDefinitions(): readonly AiAutomationProviderDefinition[] {
    return Object.freeze(
      [...this.byId.values()].map((p) => p.definition),
    );
  }
}

/** Process-wide registry seeded with the built-in n8n provider. */
export const enterpriseAutomationProviderRegistry =
  new AiAutomationProviderRegistry();
