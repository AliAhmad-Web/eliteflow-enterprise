/**
 * Action plan container — goals + steps + metadata.
 * Never executes.
 */

import type { AiActionStep } from "./action-step.js";
import type { AiActionDependency } from "./action-dependency.js";
import type { AiActionSequence } from "./action-sequence.js";

export interface AiActionPlanContainer {
  readonly id: string;
  readonly name: string;
  readonly goals: readonly string[];
  readonly steps: readonly AiActionStep[];
  readonly dependencies: readonly AiActionDependency[];
  readonly sequence: AiActionSequence;
  readonly plannedAt: string;
  /** Always false — this layer never executes. */
  readonly executable: false;
}

function sanitize(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildActionGoals(input: {
  readonly actionName: string;
  readonly category: string;
  readonly capabilities: readonly string[];
  readonly fallback: boolean;
}): readonly string[] {
  if (input.fallback) {
    return Object.freeze([
      sanitize("Clarify user intent safely"),
      sanitize("Provide a planning-only assistant response"),
    ]);
  }

  const goals = [
    sanitize(`Plan ${input.actionName} without execution`),
    sanitize(`Respect ${input.category} action boundaries`),
  ];

  for (const capability of input.capabilities.slice(0, 3)) {
    goals.push(sanitize(`Include planned ${capability} step`));
  }

  return Object.freeze(goals.slice(0, 6));
}

export function buildActionPlanContainer(input: {
  readonly actionName: string;
  readonly goals: readonly string[];
  readonly steps: readonly AiActionStep[];
  readonly dependencies: readonly AiActionDependency[];
  readonly sequence: AiActionSequence;
}): AiActionPlanContainer {
  return Object.freeze({
    id: "action.plan.primary",
    name: sanitize(`${input.actionName} Plan`, 60),
    goals: Object.freeze([...input.goals]),
    steps: input.steps,
    dependencies: input.dependencies,
    sequence: input.sequence,
    plannedAt: new Date().toISOString(),
    executable: false,
  });
}
