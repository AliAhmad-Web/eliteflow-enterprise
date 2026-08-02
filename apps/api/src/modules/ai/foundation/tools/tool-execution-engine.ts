/**
 * Enterprise Tool Execution Engine.
 * Sequential by default; optional parallel; optional plan-driven waves.
 */

import type { AiToolExecution } from "../contracts/ai-tool-execution.js";
import {
  isAiParallelToolExecutionEnabled,
  isAiRealToolExecutionEnabled,
  resolveMaxParallelToolExecutions,
} from "../feature-flags.js";
import { runPlaceholderTool } from "./placeholder-tool-runners.js";
import { runRealTool } from "./real-tool-runners.js";
import type { AiToolExecutionContext } from "./tool-execution-context.js";
import type { AiToolExecutionPlan } from "./tool-execution-planner.js";
import {
  resolveToolExecutionTimeoutMs,
  runProtectedToolExecution,
  type ProtectedToolResult,
} from "./tool-execution-wrapper.js";

export interface ExecuteEligibleToolsOptions {
  readonly context: AiToolExecutionContext;
  /** When set, execute by plan waves and skip on failed dependencies. */
  readonly plan?: AiToolExecutionPlan | null;
}

function toExecutionResult(
  execution: AiToolExecution,
  protectedResult: ProtectedToolResult,
): AiToolExecution {
  if (protectedResult.status === "succeeded") {
    return {
      toolId: execution.toolId,
      status: "succeeded",
      input: execution.input,
      output: protectedResult.output,
      executionTimeMs: protectedResult.executionTime,
      metadata: protectedResult.metadata,
    };
  }

  return {
    toolId: execution.toolId,
    status: "failed",
    input: execution.input,
    error: protectedResult.error,
    errorMessage: protectedResult.error,
    executionTimeMs: protectedResult.executionTime,
    metadata: protectedResult.metadata,
  };
}

async function executeOneTool(
  execution: AiToolExecution,
  options: ExecuteEligibleToolsOptions,
  useReal: boolean,
  timeoutMs: number,
): Promise<AiToolExecution> {
  const protectedResult = await runProtectedToolExecution(
    execution.toolId,
    timeoutMs,
    {
      runner: useReal ? "real" : "placeholder",
      mode: options.context.mode ?? null,
      privacyMode: options.context.policy.privacyMode,
      parallel: isAiParallelToolExecutionEnabled(),
      planned: Boolean(options.plan),
    },
    async (signal) => {
      if (!useReal) {
        return runPlaceholderTool(execution.toolId, execution.input);
      }
      return runRealTool(
        execution.toolId,
        options.context,
        execution.input,
        signal,
      );
    },
  );

  return toExecutionResult(execution, protectedResult);
}

async function executeSequentially(
  executions: readonly AiToolExecution[],
  options: ExecuteEligibleToolsOptions,
  useReal: boolean,
  timeoutMs: number,
): Promise<readonly AiToolExecution[]> {
  const results: AiToolExecution[] = [];

  for (const execution of executions) {
    if (execution.status !== "eligible") {
      results.push(execution);
      continue;
    }

    results.push(await executeOneTool(execution, options, useReal, timeoutMs));
  }

  return results;
}

async function executeInParallel(
  executions: readonly AiToolExecution[],
  options: ExecuteEligibleToolsOptions,
  useReal: boolean,
  timeoutMs: number,
  maxParallel: number,
): Promise<readonly AiToolExecution[]> {
  const results: AiToolExecution[] = new Array(executions.length);
  const eligibleIndexes: number[] = [];

  for (let i = 0; i < executions.length; i += 1) {
    const execution = executions[i]!;
    if (execution.status !== "eligible") {
      results[i] = execution;
    } else {
      eligibleIndexes.push(i);
    }
  }

  if (eligibleIndexes.length === 0) {
    return results;
  }

  const limit = Math.max(1, Math.min(maxParallel, eligibleIndexes.length));
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const slot = next;
      next += 1;
      if (slot >= eligibleIndexes.length) {
        return;
      }

      const index = eligibleIndexes[slot]!;
      const execution = executions[index]!;

      try {
        results[index] = await executeOneTool(
          execution,
          options,
          useReal,
          timeoutMs,
        );
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim()
            ? error.message.trim().slice(0, 500)
            : "Tool execution failed";
        results[index] = {
          toolId: execution.toolId,
          status: "failed",
          input: execution.input,
          error: message,
          errorMessage: message,
          executionTimeMs: 0,
          metadata: {
            runner: useReal ? "real" : "placeholder",
            parallel: true,
            unexpectedError: true,
          },
        };
      }
    }
  }

  const workers = Array.from({ length: limit }, () => worker());
  await Promise.all(workers);

  return results;
}

function skipForDependency(
  execution: AiToolExecution,
  failedDep: string,
): AiToolExecution {
  const reason = `dependency_failed:${failedDep}`;
  return {
    toolId: execution.toolId,
    status: "skipped",
    input: execution.input,
    error: reason,
    errorMessage: reason,
    metadata: {
      ...(execution.metadata ?? {}),
      skipReason: reason,
      failedDependency: failedDep,
    },
  };
}

/**
 * Execute according to planner waves.
 * Independent tools in a wave may run in parallel (when parallel flag on).
 * Dependent tools wait for prior waves; failed deps skip downstream tools.
 */
async function executeWithPlan(
  executions: readonly AiToolExecution[],
  options: ExecuteEligibleToolsOptions,
  plan: AiToolExecutionPlan,
  useReal: boolean,
  timeoutMs: number,
): Promise<readonly AiToolExecution[]> {
  const byId = new Map(executions.map((item, index) => [item.toolId, index]));
  const results: AiToolExecution[] = executions.map((item) => item);
  const succeeded = new Set<string>();
  const failed = new Set<string>();
  const nodeById = new Map(plan.nodes.map((node) => [node.toolId, node]));

  // Plan-time / prior skips count as failed dependencies for downstream tools.
  for (const execution of results) {
    if (
      execution.status === "skipped" ||
      execution.status === "failed"
    ) {
      failed.add(execution.toolId);
    }
  }

  const maxParallel = isAiParallelToolExecutionEnabled()
    ? resolveMaxParallelToolExecutions()
    : 1;

  for (const wave of plan.waves) {
    const runnable: { index: number; execution: AiToolExecution }[] = [];

    for (const toolId of wave) {
      const index = byId.get(toolId);
      if (index === undefined) continue;
      const execution = results[index]!;
      if (execution.status !== "eligible") continue;

      const node = nodeById.get(toolId);
      const deps = node?.dependsOn ?? [];
      if (deps.length > 0) {
        const blocker = deps.find((dep) => !succeeded.has(dep));
        if (blocker) {
          results[index] = skipForDependency(execution, blocker);
          failed.add(toolId);
          continue;
        }
      }

      runnable.push({ index, execution });
    }

    if (runnable.length === 0) continue;

    if (maxParallel <= 1 || runnable.length === 1) {
      for (const item of runnable) {
        const result = await executeOneTool(
          item.execution,
          options,
          useReal,
          timeoutMs,
        );
        results[item.index] = result;
        if (result.status === "succeeded") succeeded.add(result.toolId);
        else failed.add(result.toolId);
      }
    } else {
      const limit = Math.max(1, Math.min(maxParallel, runnable.length));
      let next = 0;

      async function waveWorker(): Promise<void> {
        while (true) {
          const slot = next;
          next += 1;
          if (slot >= runnable.length) return;
          const item = runnable[slot]!;
          const result = await executeOneTool(
            item.execution,
            options,
            useReal,
            timeoutMs,
          );
          results[item.index] = result;
          if (result.status === "succeeded") succeeded.add(result.toolId);
          else failed.add(result.toolId);
        }
      }

      await Promise.all(Array.from({ length: limit }, () => waveWorker()));
    }
  }

  return results;
}

/**
 * Execute eligible tools.
 * Non-eligible entries are passed through unchanged (order preserved).
 * Individual failures are recorded as status=failed; execution continues.
 */
export async function executeEligibleTools(
  executions: readonly AiToolExecution[],
  options: ExecuteEligibleToolsOptions,
): Promise<readonly AiToolExecution[]> {
  const useReal = isAiRealToolExecutionEnabled();
  const timeoutMs = resolveToolExecutionTimeoutMs();

  if (options.plan) {
    return executeWithPlan(
      executions,
      options,
      options.plan,
      useReal,
      timeoutMs,
    );
  }

  if (!isAiParallelToolExecutionEnabled()) {
    return executeSequentially(executions, options, useReal, timeoutMs);
  }

  return executeInParallel(
    executions,
    options,
    useReal,
    timeoutMs,
    resolveMaxParallelToolExecutions(),
  );
}
