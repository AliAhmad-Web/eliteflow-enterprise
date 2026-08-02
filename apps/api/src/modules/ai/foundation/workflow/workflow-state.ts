/**
 * Workflow state — always planned/idle in this layer (no execution).
 */

export type AiWorkflowLifecycleState =
  | "planned"
  | "queued"
  | "waiting"
  | "blocked"
  | "idle";

export interface AiWorkflowState {
  readonly lifecycle: AiWorkflowLifecycleState;
  readonly currentStepId: string | null;
  readonly waitingStepIds: readonly string[];
  readonly retryCount: number;
  readonly executable: false;
}

export function formatWorkflowLifecycleState(
  state: AiWorkflowLifecycleState,
): string {
  switch (state) {
    case "planned":
      return "Planned";
    case "queued":
      return "Queued";
    case "waiting":
      return "Waiting";
    case "blocked":
      return "Blocked";
    case "idle":
      return "Idle";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function buildWorkflowState(input: {
  readonly hasPlan: boolean;
  readonly blocked: boolean;
  readonly waitingStepIds: readonly string[];
  readonly kind: string;
}): AiWorkflowState {
  let lifecycle: AiWorkflowLifecycleState = "planned";
  if (!input.hasPlan) lifecycle = "idle";
  else if (input.blocked) lifecycle = "blocked";
  else if (input.waitingStepIds.length > 0) lifecycle = "waiting";
  else if (input.kind === "background") lifecycle = "queued";

  return Object.freeze({
    lifecycle,
    currentStepId: input.waitingStepIds[0] ?? null,
    waitingStepIds: Object.freeze([...input.waitingStepIds]),
    retryCount: 0,
    executable: false,
  });
}
