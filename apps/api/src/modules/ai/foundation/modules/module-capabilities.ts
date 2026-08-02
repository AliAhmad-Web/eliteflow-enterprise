/**
 * Module capability helpers — pure metadata projections.
 */

import type {
  AiEnterpriseModuleDefinition,
  AiEnterpriseModuleSummary,
} from "./module-definition.js";

/**
 * Project a registered module into a safe public summary.
 */
export function toModuleSummary(
  module: AiEnterpriseModuleDefinition,
): AiEnterpriseModuleSummary {
  return Object.freeze({
    id: module.id,
    name: module.name,
    description: module.description,
    supportedActions: Object.freeze([...module.supportedActions]),
    supportedEntities: Object.freeze([...module.supportedEntities]),
    priority: module.priority,
    availability: module.availability,
  });
}

/**
 * Collect unique capability labels across modules (safe public strings only).
 */
export function collectModuleCapabilities(
  modules: readonly AiEnterpriseModuleDefinition[],
): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const module of modules) {
    for (const action of module.supportedActions) {
      const label = action.replace(/[\r\n\t]+/g, " ").trim().slice(0, 40);
      if (!label || seen.has(label)) continue;
      seen.add(label);
      out.push(label);
    }
  }

  return Object.freeze(out);
}
