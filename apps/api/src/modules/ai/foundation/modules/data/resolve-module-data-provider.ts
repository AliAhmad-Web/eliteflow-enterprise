/**
 * Resolve a Module Data Provider from the registry.
 */

import type { AiModuleDataProvider } from "./module-data-provider.js";
import {
  AiModuleDataRegistry,
} from "./module-data-registry.js";
import { enterpriseModuleDataRegistry } from "./builtin-data-providers.js";

export interface ResolveModuleDataProviderInput {
  readonly moduleId: string;
  readonly registry?: AiModuleDataRegistry;
}

export function resolveModuleDataProvider(
  input: ResolveModuleDataProviderInput,
): AiModuleDataProvider | null {
  const registry = input.registry ?? enterpriseModuleDataRegistry;
  return registry.get(input.moduleId) ?? null;
}
