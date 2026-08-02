/**
 * Action sequence metadata — ordered step ids for planning.
 * Never executes.
 */

import type { AiActionStep } from "./action-step.js";

export interface AiActionSequence {
  readonly orderedStepIds: readonly string[];
  readonly parallelGroups: readonly (readonly string[])[];
  readonly mode: "sequential" | "mixed";
}

export function buildActionSequence(
  steps: readonly AiActionStep[],
): AiActionSequence {
  const ordered = [...steps]
    .sort((a, b) => a.order - b.order)
    .map((s) => s.id);

  const optional = steps
    .filter((s) => s.optional)
    .map((s) => s.id);

  return Object.freeze({
    orderedStepIds: Object.freeze(ordered),
    parallelGroups: Object.freeze(
      optional.length > 1 ? [Object.freeze(optional)] : Object.freeze([]),
    ),
    mode: optional.length > 1 ? "mixed" : "sequential",
  });
}
