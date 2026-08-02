/**
 * Action postconditions — expected outcomes (planning metadata).
 * Never executes.
 */

export interface AiActionPostcondition {
  readonly id: string;
  readonly label: string;
  readonly verified: boolean;
}

function sanitize(value: string, max = 100): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildActionPostconditions(input: {
  readonly actionName: string;
  readonly stepCount: number;
  readonly requiresApproval: boolean;
}): readonly AiActionPostcondition[] {
  return Object.freeze([
    Object.freeze({
      id: "post.plan.complete",
      label: sanitize(`Plan documented for ${input.actionName}`),
      verified: input.stepCount > 0,
    }),
    Object.freeze({
      id: "post.user.informed",
      label: sanitize("User receives safe planning summary"),
      verified: true,
    }),
    Object.freeze({
      id: "post.approval.recorded",
      label: sanitize("Approval requirement captured when needed"),
      verified: true,
    }),
    Object.freeze({
      id: "post.no.side.effects",
      label: sanitize("No business side effects from planning"),
      verified: true,
    }),
    ...(input.requiresApproval
      ? [
          Object.freeze({
            id: "post.approval.pending",
            label: sanitize("Execution blocked until approval"),
            verified: false,
          }),
        ]
      : []),
  ]);
}
