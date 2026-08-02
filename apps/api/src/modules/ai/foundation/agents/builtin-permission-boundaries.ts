/**
 * Built-in Agent Permission Boundaries (Chat, Analysis, Document, Workflow).
 * Public capability labels only — never private permission keys.
 */

import type { AiAgentType } from "./ai-agent.js";
import type { AiAgentSecurityLevel } from "./ai-agent-permissions.js";

export interface AiAgentPermissionBoundary {
  readonly allowedTools: readonly string[];
  readonly deniedTools: readonly string[];
  readonly allowedActions: readonly string[];
  readonly deniedActions: readonly string[];
  readonly allowedEntityTypes: readonly string[];
  readonly deniedEntityTypes: readonly string[];
  readonly securityLevel: AiAgentSecurityLevel;
  readonly reason: string;
}

/** Catalog-wide public tool labels used for deny-by-default boundaries. */
export const ENTERPRISE_TOOL_LABELS = Object.freeze([
  "Email Draft",
  "Documents",
  "Summarize",
  "Tasks",
  "Calendar",
  "Reports",
  "Projects",
  "Clients",
  "Finance Export",
] as const);

const ALL_ACTIONS = Object.freeze([
  "respond",
  "clarify",
  "summarize",
  "analyze",
  "compare",
  "draft",
  "organize",
  "plan",
  "schedule",
  "assign",
  "notify",
  "export",
] as const);

const ALL_ENTITIES = Object.freeze([
  "document",
  "project",
  "report",
  "task",
  "client",
  "calendar",
  "finance",
] as const);

function denyExcept(
  universe: readonly string[],
  allowed: readonly string[],
): readonly string[] {
  const allow = new Set(allowed);
  return Object.freeze(universe.filter((item) => !allow.has(item)));
}

export const CHAT_PERMISSION_BOUNDARY: AiAgentPermissionBoundary = Object.freeze({
  allowedTools: Object.freeze(["Summarize"]),
  deniedTools: denyExcept(ENTERPRISE_TOOL_LABELS, ["Summarize"]),
  allowedActions: Object.freeze(["respond", "clarify", "summarize"]),
  deniedActions: denyExcept(ALL_ACTIONS, ["respond", "clarify", "summarize"]),
  allowedEntityTypes: Object.freeze([]),
  deniedEntityTypes: Object.freeze([...ALL_ENTITIES]),
  securityLevel: "standard",
  reason: "Chat agent: conversational scope with minimal tool access",
});

export const ANALYSIS_PERMISSION_BOUNDARY: AiAgentPermissionBoundary =
  Object.freeze({
    allowedTools: Object.freeze(["Projects", "Reports", "Summarize"]),
    deniedTools: denyExcept(ENTERPRISE_TOOL_LABELS, [
      "Projects",
      "Reports",
      "Summarize",
    ]),
    allowedActions: Object.freeze(["summarize", "analyze", "compare"]),
    deniedActions: denyExcept(ALL_ACTIONS, [
      "summarize",
      "analyze",
      "compare",
    ]),
    allowedEntityTypes: Object.freeze(["project", "report"]),
    deniedEntityTypes: denyExcept(ALL_ENTITIES, ["project", "report"]),
    securityLevel: "enterprise",
    reason: "Analysis agent: enterprise read-analysis scope",
  });

export const DOCUMENT_PERMISSION_BOUNDARY: AiAgentPermissionBoundary =
  Object.freeze({
    allowedTools: Object.freeze(["Documents", "Summarize"]),
    deniedTools: denyExcept(ENTERPRISE_TOOL_LABELS, ["Documents", "Summarize"]),
    allowedActions: Object.freeze(["summarize", "draft", "organize"]),
    deniedActions: denyExcept(ALL_ACTIONS, [
      "summarize",
      "draft",
      "organize",
    ]),
    allowedEntityTypes: Object.freeze(["document"]),
    deniedEntityTypes: denyExcept(ALL_ENTITIES, ["document"]),
    securityLevel: "elevated",
    reason: "Document agent: document drafting and summarization scope",
  });

export const WORKFLOW_PERMISSION_BOUNDARY: AiAgentPermissionBoundary =
  Object.freeze({
    allowedTools: Object.freeze([
      "Tasks",
      "Calendar",
      "Email Draft",
      "Clients",
    ]),
    deniedTools: denyExcept(ENTERPRISE_TOOL_LABELS, [
      "Tasks",
      "Calendar",
      "Email Draft",
      "Clients",
    ]),
    allowedActions: Object.freeze(["plan", "schedule", "assign", "notify"]),
    deniedActions: denyExcept(ALL_ACTIONS, [
      "plan",
      "schedule",
      "assign",
      "notify",
    ]),
    allowedEntityTypes: Object.freeze(["task", "client", "calendar"]),
    deniedEntityTypes: denyExcept(ALL_ENTITIES, [
      "task",
      "client",
      "calendar",
    ]),
    securityLevel: "elevated",
    reason: "Workflow agent: operational action scope without finance export",
  });

export const DEFAULT_PERMISSION_BOUNDARY: AiAgentPermissionBoundary =
  Object.freeze({
    allowedTools: Object.freeze([]),
    deniedTools: Object.freeze([...ENTERPRISE_TOOL_LABELS]),
    allowedActions: Object.freeze(["respond"]),
    deniedActions: denyExcept(ALL_ACTIONS, ["respond"]),
    allowedEntityTypes: Object.freeze([]),
    deniedEntityTypes: Object.freeze([...ALL_ENTITIES]),
    securityLevel: "restricted",
    reason: "Default restricted agent permission boundary",
  });

export const BUILTIN_PERMISSION_BOUNDARIES: Readonly<
  Record<Exclude<AiAgentType, "custom">, AiAgentPermissionBoundary>
> = Object.freeze({
  chat: CHAT_PERMISSION_BOUNDARY,
  analysis: ANALYSIS_PERMISSION_BOUNDARY,
  document: DOCUMENT_PERMISSION_BOUNDARY,
  workflow: WORKFLOW_PERMISSION_BOUNDARY,
});
