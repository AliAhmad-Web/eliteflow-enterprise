/**
 * Placeholder tool runners for the Enterprise Tool Execution Engine.
 * Mock success only — no external APIs, no DB writes, no business mutations.
 */

import type { AiToolId } from "../contracts/ai-tool-execution.js";

/**
 * Run a catalog tool as a no-op placeholder.
 * Always resolves with a structured mock success payload.
 */
export async function runPlaceholderTool(
  toolId: AiToolId,
  input?: Readonly<Record<string, unknown>>,
): Promise<Readonly<Record<string, unknown>>> {
  const output: Record<string, unknown> = {
    ok: true,
    toolId,
    placeholder: true,
    message: `Placeholder execution succeeded for tool '${toolId}'`,
  };

  if (input && Object.keys(input).length > 0) {
    output.echoedInputKeys = Object.keys(input);
  }

  return output;
}
