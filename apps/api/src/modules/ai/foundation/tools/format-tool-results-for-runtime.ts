/**
 * Format completed tool execution results for Runtime Instructions.
 * Injection only — does not execute tools or mutate business data.
 */

import type { AiToolExecution } from "../contracts/ai-tool-execution.js";

const MAX_OUTPUT_CHARS = 400;

export interface FormatToolResultsForRuntimeOptions {
  /** When true, include failed tool error summaries. Default: false. */
  readonly includeFailed?: boolean;
}

function sanitizeLine(value: string, max = MAX_OUTPUT_CHARS): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function summarizeOutput(
  output: Readonly<Record<string, unknown>> | undefined,
): string {
  if (!output || Object.keys(output).length === 0) {
    return "ok";
  }

  try {
    return sanitizeLine(JSON.stringify(output));
  } catch {
    return "ok";
  }
}

function formatSucceeded(execution: AiToolExecution): string {
  const summary = summarizeOutput(execution.output);
  return `- [${sanitizeLine(execution.toolId, 80)}] succeeded: ${summary}`;
}

function formatFailed(execution: AiToolExecution): string {
  const err = sanitizeLine(
    execution.errorMessage?.trim() || "unknown error",
    200,
  );
  return `- [${sanitizeLine(execution.toolId, 80)}] failed: ${err}`;
}

/**
 * Build structured runtime metadata from tool executions.
 * - Includes succeeded tools only by default
 * - Ignores skipped / eligible / running / pending
 * - Failed tools included only when includeFailed=true
 */
export function formatToolResultsForRuntime(
  executions: readonly AiToolExecution[],
  options: FormatToolResultsForRuntimeOptions = {},
): string {
  const includeFailed = options.includeFailed === true;
  const lines: string[] = [];

  for (const execution of executions) {
    switch (execution.status) {
      case "succeeded":
        lines.push(formatSucceeded(execution));
        break;
      case "failed":
        if (includeFailed) {
          lines.push(formatFailed(execution));
        }
        break;
      case "skipped":
      case "eligible":
      case "running":
      case "pending_confirmation":
        break;
      default: {
        const _exhaustive: never = execution.status;
        void _exhaustive;
        break;
      }
    }
  }

  if (lines.length === 0) {
    return "";
  }

  return ["Tool results (successful executions):", ...lines].join("\n");
}
