/**
 * Module context helpers for resolution scoring.
 * Uses safe runtime signals only — never loads business payloads.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiActiveAgent } from "../agents/ai-agent.js";
import type { AiAgentDecision } from "../agents/ai-agent-decision.js";
import type { AiBusinessQuery } from "../business-query/business-query.js";

export interface AiModuleResolutionContext {
  readonly activeContext: AiActiveContext;
  readonly activeAgent?: AiActiveAgent | null;
  readonly agentDecision?: AiAgentDecision | null;
  readonly businessQuery?: AiBusinessQuery | null;
  readonly mode?: string | null;
  readonly prompt?: string | null;
}

export function resolveIntentHints(
  context: AiModuleResolutionContext,
): readonly string[] {
  const hints: string[] = [];
  const mode = (context.mode ?? context.activeContext.mode ?? "")
    .toLowerCase()
    .trim();
  if (mode) hints.push(mode);

  const prompt = (context.prompt ?? "").toLowerCase();
  const keywords = [
    "client",
    "crm",
    "project",
    "task",
    "hr",
    "employee",
    "finance",
    "invoice",
    "calendar",
    "meeting",
    "document",
    "report",
    "notification",
    "setting",
    "file",
    "storage",
  ] as const;

  for (const keyword of keywords) {
    if (prompt.includes(keyword)) hints.push(keyword);
  }

  if (context.agentDecision?.documentPreference === "high") {
    hints.push("document");
  }
  if (
    context.agentDecision?.toolPreference === "high" ||
    context.agentDecision?.executionMode === "workflow"
  ) {
    hints.push("task");
    hints.push("calendar");
  }

  // Prefer structured Business Query signals when present.
  const query = context.businessQuery;
  if (query?.entity) {
    hints.push(query.entity);
  }
  if (query?.moduleName) {
    hints.push(query.moduleName.toLowerCase());
  }
  if (query?.intent) {
    hints.push(query.intent);
  }
  for (const filter of query?.filters ?? []) {
    hints.push(filter.replace(/_/g, " "));
  }

  return Object.freeze([...new Set(hints)]);
}

export function resolveEntityTypeHints(
  activeContext: AiActiveContext,
  businessQuery?: AiBusinessQuery | null,
): readonly string[] {
  const types = [
    ...(activeContext.primaryEntity
      ? [activeContext.primaryEntity.type.toLowerCase()]
      : []),
    ...activeContext.entities.map((entity) => entity.type.toLowerCase()),
    ...(businessQuery?.entity ? [businessQuery.entity] : []),
  ];
  return Object.freeze([...new Set(types)]);
}
