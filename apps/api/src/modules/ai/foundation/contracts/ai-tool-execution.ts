/**
 * Tool / agent execution contract.
 * Status progresses: eligible → succeeded | failed | skipped.
 */

export type AiToolId = string;

export type AiToolExecutionStatus =
  | "eligible"
  | "pending_confirmation"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped";

export interface AiToolExecution {
  readonly toolId: AiToolId;
  readonly status: AiToolExecutionStatus;
  readonly input?: Readonly<Record<string, unknown>>;
  readonly output?: Readonly<Record<string, unknown>>;
  /** Human-readable error when status=failed (same as structured `error`). */
  readonly errorMessage?: string;
  /** Wall-clock execution duration in milliseconds. */
  readonly executionTimeMs?: number;
  /** Structured error string when status=failed. */
  readonly error?: string;
  /** Non-sensitive execution metadata (mode, timeout, runner kind, etc.). */
  readonly metadata?: Readonly<Record<string, unknown>>;
}
