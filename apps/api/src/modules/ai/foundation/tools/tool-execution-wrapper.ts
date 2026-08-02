/**
 * Protected tool execution wrapper: timeout, timing, logging, structured result.
 */

export interface ProtectedToolResult {
  readonly status: "succeeded" | "failed";
  readonly executionTime: number;
  readonly output?: Readonly<Record<string, unknown>>;
  readonly error?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export class ToolExecutionTimeoutError extends Error {
  constructor(toolId: string, timeoutMs: number) {
    super(`Tool '${toolId}' exceeded timeout of ${timeoutMs}ms`);
    this.name = "ToolExecutionTimeoutError";
  }
}

function logToolExecution(details: Record<string, unknown>): void {
  try {
    console.info("[ai:tool-execution]", JSON.stringify(details));
  } catch {
    // Logging must never break the pipeline.
  }
}

/**
 * Run a tool function under timeout + error isolation.
 * Never throws to the caller — always returns a structured result.
 */
export async function runProtectedToolExecution(
  toolId: string,
  timeoutMs: number,
  metadataBase: Readonly<Record<string, unknown>>,
  execute: (signal: AbortSignal) => Promise<Readonly<Record<string, unknown>>>,
): Promise<ProtectedToolResult> {
  const started = Date.now();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ToolExecutionTimeoutError(toolId, timeoutMs));
    }, timeoutMs);
  });

  try {
    const output = await Promise.race([
      execute(controller.signal),
      timeoutPromise,
    ]);

    const executionTime = Date.now() - started;
    const result: ProtectedToolResult = {
      status: "succeeded",
      executionTime,
      output,
      metadata: {
        ...metadataBase,
        toolId,
        timeoutMs,
        timedOut: false,
      },
    };

    logToolExecution({
      toolId,
      status: result.status,
      executionTime,
      timedOut: false,
    });

    return result;
  } catch (error) {
    const executionTime = Date.now() - started;
    const timedOut = error instanceof ToolExecutionTimeoutError;
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim().slice(0, 500)
        : "Tool execution failed";

    const result: ProtectedToolResult = {
      status: "failed",
      executionTime,
      error: message,
      metadata: {
        ...metadataBase,
        toolId,
        timeoutMs,
        timedOut,
        errorName: error instanceof Error ? error.name : "Error",
      },
    };

    logToolExecution({
      toolId,
      status: result.status,
      executionTime,
      timedOut,
      error: message,
    });

    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function resolveToolExecutionTimeoutMs(): number {
  const raw = process.env.AI_TOOL_EXECUTION_TIMEOUT_MS?.trim();
  if (!raw) return 10_000;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 1) return 10_000;
  return Math.min(value, 120_000);
}
