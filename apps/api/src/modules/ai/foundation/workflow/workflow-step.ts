/**
 * Workflow step metadata for orchestration planning.
 * Never executes.
 */

import type { AiWorkflowKind } from "./workflow-definition.js";

export type AiWorkflowStepKind =
  | "action"
  | "approval"
  | "wait"
  | "branch"
  | "parallel"
  | "retry"
  | "complete";

export type AiWorkflowStepStatus =
  | "planned"
  | "waiting"
  | "blocked"
  | "ready";

export interface AiWorkflowStep {
  readonly id: string;
  readonly order: number;
  readonly name: string;
  readonly kind: AiWorkflowStepKind;
  readonly status: AiWorkflowStepStatus;
  readonly actionStepId: string | null;
  readonly retryLimit: number;
  readonly waiting: boolean;
}

export function formatWorkflowStepKind(kind: AiWorkflowStepKind): string {
  switch (kind) {
    case "action":
      return "Action";
    case "approval":
      return "Approval";
    case "wait":
      return "Wait";
    case "branch":
      return "Branch";
    case "parallel":
      return "Parallel";
    case "retry":
      return "Retry";
    case "complete":
      return "Complete";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function sanitize(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildWorkflowSteps(input: {
  readonly actionStepIds: readonly string[];
  readonly actionStepNames: readonly string[];
  readonly kind: AiWorkflowKind;
  readonly requiresApproval: boolean;
}): readonly AiWorkflowStep[] {
  const steps: AiWorkflowStep[] = [];
  let order = 1;

  steps.push(
    Object.freeze({
      id: "wf.step.start",
      order,
      name: "Start",
      kind: "action" as const,
      status: "ready" as const,
      actionStepId: null,
      retryLimit: 0,
      waiting: false,
    }),
  );
  order += 1;

  if (input.kind === "conditional" || input.kind === "human-in-the-loop") {
    steps.push(
      Object.freeze({
        id: "wf.step.branch",
        order,
        name: "Evaluate Conditions",
        kind: "branch" as const,
        status: "planned" as const,
        actionStepId: null,
        retryLimit: 0,
        waiting: false,
      }),
    );
    order += 1;
  }

  const maxActions = Math.min(input.actionStepIds.length, 5);
  for (let i = 0; i < maxActions; i += 1) {
    const isParallel = input.kind === "parallel" && i > 0;
    steps.push(
      Object.freeze({
        id: `wf.step.action.${i + 1}`,
        order,
        name: sanitize(input.actionStepNames[i] ?? `Action ${i + 1}`),
        kind: isParallel ? ("parallel" as const) : ("action" as const),
        status: "planned" as const,
        actionStepId: input.actionStepIds[i] ?? null,
        retryLimit: input.kind === "background" ? 2 : 1,
        waiting: false,
      }),
    );
    order += 1;
  }

  if (input.requiresApproval || input.kind === "approval") {
    steps.push(
      Object.freeze({
        id: "wf.step.approval",
        order,
        name: "Await Approval",
        kind: "approval" as const,
        status: "waiting" as const,
        actionStepId: null,
        retryLimit: 0,
        waiting: true,
      }),
    );
    order += 1;
  }

  if (input.kind === "human-in-the-loop") {
    steps.push(
      Object.freeze({
        id: "wf.step.wait.human",
        order,
        name: "Human Review",
        kind: "wait" as const,
        status: "waiting" as const,
        actionStepId: null,
        retryLimit: 0,
        waiting: true,
      }),
    );
    order += 1;
  }

  if (input.kind === "background") {
    steps.push(
      Object.freeze({
        id: "wf.step.retry",
        order,
        name: "Retry Policy",
        kind: "retry" as const,
        status: "planned" as const,
        actionStepId: null,
        retryLimit: 3,
        waiting: false,
      }),
    );
    order += 1;
  }

  steps.push(
    Object.freeze({
      id: "wf.step.complete",
      order,
      name: "Complete Plan",
      kind: "complete" as const,
      status: "planned" as const,
      actionStepId: null,
      retryLimit: 0,
      waiting: false,
    }),
  );

  return Object.freeze(steps);
}
