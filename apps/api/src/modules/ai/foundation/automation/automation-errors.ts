/**
 * Automation error codes — safe public codes only.
 * Never embeds secrets, tokens, or stack traces.
 */

export type AiAutomationErrorCode =
  | "engine_disabled"
  | "provider_disabled"
  | "provider_not_found"
  | "permission_denied"
  | "approval_required"
  | "action_execution_required"
  | "privacy_mode"
  | "invalid_request"
  | "timeout"
  | "cancelled"
  | "provider_error"
  | "retry_exhausted"
  | "unknown";

export interface AiAutomationError {
  readonly code: AiAutomationErrorCode;
  readonly message: string;
  readonly retryable: boolean;
}

function sanitize(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function createAutomationError(
  code: AiAutomationErrorCode,
  message: string,
  retryable = false,
): AiAutomationError {
  return Object.freeze({
    code,
    message: sanitize(message),
    retryable,
  });
}

export function isRetryableAutomationError(
  code: AiAutomationErrorCode,
): boolean {
  switch (code) {
    case "timeout":
    case "provider_error":
      return true;
    case "engine_disabled":
    case "provider_disabled":
    case "provider_not_found":
    case "permission_denied":
    case "approval_required":
    case "action_execution_required":
    case "privacy_mode":
    case "invalid_request":
    case "cancelled":
    case "retry_exhausted":
    case "unknown":
      return false;
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}
