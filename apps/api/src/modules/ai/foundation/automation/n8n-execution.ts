/**
 * n8n execution metadata — simulated / stub execution ids.
 */

export interface AiN8nExecutionRef {
  readonly executionId: string;
  readonly workflowId: string;
  readonly startedAt: string;
  readonly mode: "sync" | "async" | "background" | "callback";
}

export function createN8nExecutionRef(input: {
  readonly workflowId: string;
  readonly mode: "sync" | "async" | "background" | "callback";
}): AiN8nExecutionRef {
  const executionId = `n8n.exec.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
  return Object.freeze({
    executionId,
    workflowId: input.workflowId,
    startedAt: new Date().toISOString(),
    mode: input.mode,
  });
}
