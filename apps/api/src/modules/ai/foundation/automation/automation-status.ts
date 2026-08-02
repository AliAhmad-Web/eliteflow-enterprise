/**
 * Automation status codes.
 */

export type AiAutomationStatus =
  | "pending"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "blocked"
  | "cancelled"
  | "timeout"
  | "awaiting_callback"
  | "background";

export function formatAutomationStatus(status: AiAutomationStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "queued":
      return "Queued";
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
    case "cancelled":
      return "Cancelled";
    case "timeout":
      return "Timeout";
    case "awaiting_callback":
      return "Awaiting Callback";
    case "background":
      return "Background";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
