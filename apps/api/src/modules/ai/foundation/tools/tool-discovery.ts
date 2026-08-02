/**
 * Tool Discovery Engine — read registry, filter disabled/unsupported tools.
 * Never executes tools. Never mutates business data.
 */

import type { AiToolDefinition } from "./tool-catalog.js";
import type { AiToolRegistration } from "./tool-registry.js";

/**
 * Discover available tools from registry registrations.
 * Returns an immutable list of definitions for eligibility.
 */
export function discoverTools(
  registrations: readonly AiToolRegistration[],
): readonly AiToolDefinition[] {
  const discovered: AiToolDefinition[] = [];

  for (const registration of registrations) {
    if (!registration.enabled) continue;
    if (!registration.supported) continue;
    discovered.push(registration.definition);
  }

  return Object.freeze([...discovered]);
}
