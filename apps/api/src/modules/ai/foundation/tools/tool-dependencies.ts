/**
 * Declared tool dependency edges for the Execution Planner.
 * Only edges among selected tools are applied at plan time.
 */

import type { AiToolId } from "../contracts/ai-tool-execution.js";

/**
 * toolId → toolIds that must succeed before it may run.
 * Automatic discovery uses this static enterprise graph.
 */
export const AI_TOOL_DEPENDENCIES: Readonly<
  Record<string, readonly AiToolId[]>
> = {
  lookup_client: [],
  summarize_content: [],
  analyze_project: [],
  analyze_report: ["analyze_project"],
  draft_email: ["lookup_client", "summarize_content"],
  save_ai_document: ["summarize_content", "draft_email"],
  create_task: ["analyze_project", "lookup_client"],
  create_calendar_event: ["create_task", "lookup_client"],
};

export function getDeclaredDependencies(
  toolId: AiToolId,
): readonly AiToolId[] {
  return AI_TOOL_DEPENDENCIES[toolId] ?? [];
}
