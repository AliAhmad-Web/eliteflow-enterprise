/**
 * Business Query Engine — orchestrate parse → build.
 * Never executes queries. Never loads business data.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiActiveAgent } from "../agents/ai-agent.js";
import type { AiAgentDecision } from "../agents/ai-agent-decision.js";
import type { AiBusinessQuery } from "./business-query.js";
import { parseBusinessQuerySignals } from "./business-query-parser.js";
import { buildBusinessQuery } from "./business-query-builder.js";

export interface ResolveBusinessQueryInput {
  readonly prompt?: string | null;
  readonly mode?: string | null;
  readonly activeContext: AiActiveContext;
  readonly activeAgent?: AiActiveAgent | null;
  readonly agentDecision?: AiAgentDecision | null;
}

/**
 * Resolve an immutable Business Query from runtime signals.
 */
export function resolveBusinessQuery(
  input: ResolveBusinessQueryInput,
): AiBusinessQuery {
  const signals = parseBusinessQuerySignals(input.prompt);

  // Soft boost from agent decision (metadata only — does not invent entities).
  let adjusted = signals;
  if (
    !signals.entity &&
    input.agentDecision?.documentPreference === "high"
  ) {
    adjusted = Object.freeze({
      ...signals,
      entity: "document" as const,
      matchedEntityKeywords: Object.freeze([
        ...signals.matchedEntityKeywords,
        "agent-document-preference",
      ]),
    });
  } else if (
    !signals.entity &&
    (input.agentDecision?.toolPreference === "high" ||
      input.agentDecision?.executionMode === "workflow")
  ) {
    adjusted = Object.freeze({
      ...signals,
      entity: "task" as const,
      matchedEntityKeywords: Object.freeze([
        ...signals.matchedEntityKeywords,
        "agent-workflow-preference",
      ]),
    });
  }

  return buildBusinessQuery({
    signals: adjusted,
    activeContext: input.activeContext,
    mode: input.mode,
  });
}

/** Alias for engine entry point naming. */
export const businessQueryEngine = Object.freeze({
  resolve: resolveBusinessQuery,
});
