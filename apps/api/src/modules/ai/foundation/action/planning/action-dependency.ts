/**
 * Action dependency metadata for planning.
 * Never executes.
 */

import type { AiActionStep } from "./action-step.js";

export type AiActionDependencyKind =
  | "sequence"
  | "approval"
  | "precondition"
  | "resource";

export interface AiActionDependency {
  readonly id: string;
  readonly kind: AiActionDependencyKind;
  readonly fromStepId: string | null;
  readonly toStepId: string;
  readonly description: string;
}

export function formatActionDependencyKind(
  kind: AiActionDependencyKind,
): string {
  switch (kind) {
    case "sequence":
      return "Sequence";
    case "approval":
      return "Approval";
    case "precondition":
      return "Precondition";
    case "resource":
      return "Resource";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function sanitize(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildActionDependencies(input: {
  readonly steps: readonly AiActionStep[];
  readonly requiresApproval: boolean;
}): readonly AiActionDependency[] {
  const deps: AiActionDependency[] = [];
  const ordered = [...input.steps].sort((a, b) => a.order - b.order);

  for (let i = 1; i < ordered.length; i += 1) {
    const prev = ordered[i - 1];
    const next = ordered[i];
    if (!prev || !next) continue;
    deps.push(
      Object.freeze({
        id: `dep.seq.${prev.id}.${next.id}`,
        kind: "sequence" as const,
        fromStepId: prev.id,
        toStepId: next.id,
        description: sanitize(`${prev.name} precedes ${next.name}`),
      }),
    );
  }

  if (input.requiresApproval) {
    const approval = ordered.find((s) => s.id === "step.approve");
    if (approval) {
      deps.push(
        Object.freeze({
          id: "dep.approval.gate",
          kind: "approval" as const,
          fromStepId: null,
          toStepId: approval.id,
          description: "Approval gate must clear before continuation",
        }),
      );
    }
  }

  const first = ordered[0];
  if (first) {
    deps.push(
      Object.freeze({
        id: "dep.precondition.context",
        kind: "precondition" as const,
        fromStepId: null,
        toStepId: first.id,
        description: "Safe context and policy checks must hold",
      }),
    );
  }

  return Object.freeze(deps.slice(0, 12));
}
