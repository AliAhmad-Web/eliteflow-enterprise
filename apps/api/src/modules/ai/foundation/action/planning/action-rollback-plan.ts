/**
 * Action rollback plan — planning metadata only.
 * Never executes rollbacks.
 */

export interface AiActionRollbackStep {
  readonly id: string;
  readonly order: number;
  readonly description: string;
}

export interface AiActionRollbackPlan {
  readonly steps: readonly AiActionRollbackStep[];
  readonly summary: string;
}

function sanitize(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildActionRollbackPlan(input: {
  readonly stepCount: number;
  readonly requiresApproval: boolean;
}): AiActionRollbackPlan {
  const steps: AiActionRollbackStep[] = [
    Object.freeze({
      id: "rollback.abort",
      order: 1,
      description: sanitize("Abort remaining planned steps — no side effects"),
    }),
    Object.freeze({
      id: "rollback.notify",
      order: 2,
      description: sanitize("Record planning cancellation in runtime notes"),
    }),
  ];

  if (input.requiresApproval) {
    steps.push(
      Object.freeze({
        id: "rollback.approval",
        order: 3,
        description: sanitize("Clear pending approval gate without execution"),
      }),
    );
  }

  if (input.stepCount >= 4) {
    steps.push(
      Object.freeze({
        id: "rollback.replan",
        order: steps.length + 1,
        description: sanitize("Rebuild plan from Action Resolution if needed"),
      }),
    );
  }

  return Object.freeze({
    steps: Object.freeze(steps.slice(0, 5)),
    summary: sanitize(
      `Rollback plan with ${Math.min(steps.length, 5)} planning-only steps`,
    ),
  });
}
