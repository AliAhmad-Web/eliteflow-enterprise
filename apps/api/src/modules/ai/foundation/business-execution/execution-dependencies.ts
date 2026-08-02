/**
 * Execution dependencies — ordering constraints between phases.
 */

import type { AiBusinessExecutionPhase } from "./execution-phases.js";

export type AiBusinessExecutionDependencyKind =
  | "sequence"
  | "confirmation"
  | "measurement";

export interface AiBusinessExecutionDependency {
  readonly id: string;
  readonly fromId: string;
  readonly toId: string;
  readonly kind: AiBusinessExecutionDependencyKind;
}

export function formatExecutionDependencyKind(
  kind: AiBusinessExecutionDependencyKind,
): string {
  switch (kind) {
    case "sequence":
      return "Sequence";
    case "confirmation":
      return "Confirmation";
    case "measurement":
      return "Measurement";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function buildExecutionDependencies(input: {
  readonly phases: readonly AiBusinessExecutionPhase[];
  readonly requiresConfirmation: boolean;
}): readonly AiBusinessExecutionDependency[] {
  const deps: AiBusinessExecutionDependency[] = [];
  const phases = input.phases;

  for (let i = 0; i < phases.length - 1; i += 1) {
    const from = phases[i]!;
    const to = phases[i + 1]!;
    const kind =
      i === 0 && input.requiresConfirmation
        ? ("confirmation" as const)
        : to.id === "phase.measure"
          ? ("measurement" as const)
          : ("sequence" as const);

    deps.push(
      Object.freeze({
        id: `dep.${from.id}.${to.id}`,
        fromId: from.id,
        toId: to.id,
        kind,
      }),
    );
  }

  return Object.freeze(deps);
}
