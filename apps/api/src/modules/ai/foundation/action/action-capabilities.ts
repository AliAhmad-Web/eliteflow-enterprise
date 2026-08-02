/**
 * Action capability helpers — pure metadata projections.
 * Never executes actions or calls services.
 */

import type { AiActionDefinition } from "./action-definition.js";
import type { AiActiveAction } from "./ai-action.js";

/**
 * Project a registered action into a safe public active-action summary.
 */
export function toActiveActionSummary(
  definition: AiActionDefinition,
  resolutionReason: string,
  fallback: boolean,
  confidence: number,
): AiActiveAction {
  return Object.freeze({
    id: definition.id,
    category: definition.category,
    name: definition.name,
    description: definition.description,
    capabilities: Object.freeze([...(definition.capabilities ?? [])]),
    resolutionReason,
    fallback,
    confidence,
  });
}

/**
 * Collect unique capability labels across actions (safe public strings only).
 */
export function collectActionCapabilities(
  actions: readonly AiActionDefinition[],
): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const action of actions) {
    for (const capability of action.capabilities) {
      const label = capability.replace(/[\r\n\t]+/g, " ").trim().slice(0, 40);
      if (!label || seen.has(label)) continue;
      seen.add(label);
      out.push(label);
    }
  }

  return Object.freeze(out);
}
