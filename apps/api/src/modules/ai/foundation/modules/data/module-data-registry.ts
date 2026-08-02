/**
 * Module Data Provider Registry.
 * Registers read-only providers. No plugin remote loading.
 */

import type { AiModuleDataProvider } from "./module-data-provider.js";

export class AiModuleDataRegistry {
  private readonly byId = new Map<string, AiModuleDataProvider>();

  constructor(seed: readonly AiModuleDataProvider[] = []) {
    for (const provider of seed) {
      this.register(provider);
    }
  }

  register(provider: AiModuleDataProvider): void {
    if (provider.metadata().readOnly !== true) {
      throw new Error(
        `Module data provider ${provider.moduleId} must be read-only`,
      );
    }
    this.byId.set(provider.moduleId, provider);
  }

  get(moduleId: string): AiModuleDataProvider | undefined {
    return this.byId.get(moduleId);
  }

  list(): readonly AiModuleDataProvider[] {
    return Object.freeze([...this.byId.values()]);
  }
}
