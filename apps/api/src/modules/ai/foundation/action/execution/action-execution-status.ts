/**
 * Action execution status codes.
 * Never bypasses permission checks.
 */

export type AiActionExecutionStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "blocked"
  | "awaiting_approval"
  | "rolled_back"
  | "partial";

export type AiActionStepExecutionStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "blocked"
  | "retried"
  | "rolled_back";

export function formatActionExecutionStatus(
  status: AiActionExecutionStatus,
): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "running":
      return "Running";
    case "succeeded":
      return "Succeeded";
    case "failed":
      return "Failed";
    case "skipped":
      return "Skipped";
    case "blocked":
      return "Blocked";
    case "awaiting_approval":
      return "Awaiting Approval";
    case "rolled_back":
      return "Rolled Back";
    case "partial":
      return "Partial";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function formatActionStepExecutionStatus(
  status: AiActionStepExecutionStatus,
): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "running":
      return "Running";
    case "succeeded":
      return "Succeeded";
    case "failed":
      return "Failed";
    case "skipped":
      return "Skipped";
    case "blocked":
      return "Blocked";
    case "retried":
      return "Retried";
    case "rolled_back":
      return "Rolled Back";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
