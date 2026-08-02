/**
 * Action execution error codes — safe public codes only.
 * Never embeds stack traces, tokens, or raw records.
 */

export type AiActionExecutionErrorCode =
  | "permission_denied"
  | "privacy_mode"
  | "approval_required"
  | "missing_user"
  | "missing_plan"
  | "invalid_plan"
  | "service_error"
  | "unsupported_capability"
  | "write_blocked"
  | "precondition_failed"
  | "timeout"
  | "aborted"
  | "unknown";

export interface AiActionExecutionError {
  readonly code: AiActionExecutionErrorCode;
  readonly message: string;
  readonly stepId?: string;
  readonly retryable: boolean;
}

function sanitize(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function createActionExecutionError(
  code: AiActionExecutionErrorCode,
  message: string,
  options?: { readonly stepId?: string; readonly retryable?: boolean },
): AiActionExecutionError {
  return Object.freeze({
    code,
    message: sanitize(message),
    ...(options?.stepId ? { stepId: options.stepId } : {}),
    retryable: options?.retryable === true,
  });
}

export function isRetryableErrorCode(
  code: AiActionExecutionErrorCode,
): boolean {
  switch (code) {
    case "service_error":
    case "timeout":
      return true;
    case "permission_denied":
    case "privacy_mode":
    case "approval_required":
    case "missing_user":
    case "missing_plan":
    case "invalid_plan":
    case "unsupported_capability":
    case "write_blocked":
    case "precondition_failed":
    case "aborted":
    case "unknown":
      return false;
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}
