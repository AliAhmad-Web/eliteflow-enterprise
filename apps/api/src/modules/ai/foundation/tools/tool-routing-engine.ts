/**
 * Enterprise Tool Routing Engine.
 * Selects and prioritizes eligible tools — never executes them.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";
import type { AiProviderRequest } from "../contracts/ai-provider-request.js";
import type {
  AiToolExecution,
  AiToolId,
} from "../contracts/ai-tool-execution.js";
import {
  AI_TOOL_CATALOG,
  type AiToolDefinition,
} from "./tool-catalog.js";

export interface RouteToolsInput {
  readonly providerRequest?: AiProviderRequest | null;
  readonly activeContext: AiActiveContext;
  readonly eligibleTools: readonly AiToolExecution[];
  readonly policy: AiEffectivePolicy;
  readonly userPrompt: string;
  readonly mode?: string | null;
  /** Optional permission keys for permission-aware scoring among eligible tools. */
  readonly permissions?: readonly string[] | null;
  /** Definitions for module/entity/mode scoring (discovered or static catalog). */
  readonly catalog?: readonly AiToolDefinition[];
}

export interface AiToolRoutingDecision {
  readonly selectedTools: readonly AiToolExecution[];
  readonly routingReason: string;
  /** 0–1 confidence in the routing decision. */
  readonly confidence: number;
}

interface ScoredTool {
  readonly execution: AiToolExecution;
  readonly score: number;
  readonly reasons: string[];
}

const MAX_SELECTED = 3;
const SCORE_THRESHOLD = 2;

/** Keyword hints per tool — routing only, not execution. */
const TOOL_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  draft_email: [
    "email",
    "e-mail",
    "draft email",
    "compose email",
    "write email",
    "mailto",
    "inbox",
  ],
  save_ai_document: [
    "save document",
    "save doc",
    "store document",
    "persist document",
    "save this document",
  ],
  summarize_content: [
    "summarize",
    "summary",
    "tldr",
    "tl;dr",
    "sum up",
    "brief overview",
  ],
  create_task: [
    "create task",
    "add task",
    "new task",
    "todo",
    "to-do",
    "assign task",
  ],
  create_calendar_event: [
    "calendar",
    "schedule",
    "meeting",
    "appointment",
    "book time",
    "event",
  ],
  analyze_project: [
    "analyze project",
    "project analysis",
    "project status",
    "project health",
  ],
  analyze_report: [
    "analyze report",
    "report analysis",
    "review report",
  ],
  lookup_client: [
    "lookup client",
    "find client",
    "client info",
    "client details",
    "who is the client",
  ],
};

const MODE_TOOL_HINTS: Readonly<Record<string, readonly string[]>> = {
  EMAIL: ["draft_email"],
  SUMMARIZE: ["summarize_content"],
  ANALYZE: ["analyze_project", "analyze_report"],
  MEETING_NOTES: ["create_calendar_event", "create_task"],
  PROJECT_SUMMARY: ["analyze_project"],
};

function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().replace(/\s+/g, " ").trim();
}

function definitionById(
  catalog: readonly AiToolDefinition[],
  toolId: AiToolId,
): AiToolDefinition | null {
  return catalog.find((item) => item.id === toolId) ?? null;
}

function scoreDirectMatch(prompt: string, toolId: string): number {
  const needle = toolId.toLowerCase();
  if (!needle) return 0;
  const re = new RegExp(
    `(^|[^a-z0-9_])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9_]|$)`,
  );
  return re.test(prompt) ? 8 : 0;
}

function scoreKeywordMatch(prompt: string, toolId: string): number {
  const keywords = TOOL_KEYWORDS[toolId] ?? [];
  let best = 0;
  for (const keyword of keywords) {
    if (prompt.includes(keyword)) {
      best = Math.max(best, keyword.includes(" ") ? 5 : 3);
    }
  }
  return best;
}

function scoreModuleAware(
  definition: AiToolDefinition | null,
  moduleKey: string | null,
): number {
  if (!definition?.modules || definition.modules.length === 0) return 0;
  if (!moduleKey) return 0;
  return definition.modules.includes(moduleKey) ? 3 : 0;
}

function scoreEntityAware(
  definition: AiToolDefinition | null,
  context: AiActiveContext,
): number {
  if (
    !definition?.requiresEntityTypes ||
    definition.requiresEntityTypes.length === 0
  ) {
    return 0;
  }

  const activeTypes = new Set(
    context.entities.map((entity) => entity.type.toLowerCase()),
  );
  if (context.primaryEntity?.type) {
    activeTypes.add(context.primaryEntity.type.toLowerCase());
  }

  const matched = definition.requiresEntityTypes.some((type) =>
    activeTypes.has(type.toLowerCase()),
  );
  return matched ? 4 : 0;
}

function scorePermissionAware(
  definition: AiToolDefinition | null,
  permissions: readonly string[] | null | undefined,
): number {
  if (!definition || !permissions || permissions.length === 0) return 0;
  const permissionSet = new Set(permissions);
  const required = definition.requiredPermissions;
  if (required.length === 0) return 0;
  const allPresent = required.every((key) => permissionSet.has(key));
  // Eligible tools already passed; boost specificity when permissions are known.
  return allPresent ? Math.min(2, required.length) : 0;
}

function scoreModeAware(
  mode: string | null | undefined,
  toolId: string,
): number {
  if (!mode) return 0;
  const hints = MODE_TOOL_HINTS[mode.toUpperCase()] ?? [];
  return hints.includes(toolId) ? 4 : 0;
}

/**
 * Route among already-eligible tools.
 * Never executes tools. Never mutates eligibility rules.
 */
export function routeTools(input: RouteToolsInput): AiToolRoutingDecision {
  const providerRequest = input.providerRequest ?? null;
  const activeContext = providerRequest?.activeContext ?? input.activeContext;
  const policy = providerRequest?.policy ?? input.policy;
  const userPrompt = (
    providerRequest?.prompt ??
    input.userPrompt ??
    ""
  ).trim();
  const mode = providerRequest?.mode ?? input.mode ?? activeContext.mode;
  const eligibleTools =
    providerRequest?.eligibleTools && providerRequest.eligibleTools.length > 0
      ? providerRequest.eligibleTools
      : input.eligibleTools;

  const catalog = input.catalog ?? AI_TOOL_CATALOG;

  if (policy.privacyMode) {
    return {
      selectedTools: [],
      routingReason: "privacyMode: tool routing withheld",
      confidence: 1,
    };
  }

  const eligibleOnly = eligibleTools.filter(
    (tool) => tool.status === "eligible",
  );

  if (eligibleOnly.length === 0) {
    return {
      selectedTools: [],
      routingReason: "no eligible tools to route",
      confidence: 1,
    };
  }

  const prompt = normalizePrompt(userPrompt);

  const scored: ScoredTool[] = eligibleOnly.map((execution) => {
    const definition = definitionById(catalog, execution.toolId);
    const reasons: string[] = [];
    let score = 0;

    const direct = scoreDirectMatch(prompt, execution.toolId);
    if (direct > 0) {
      score += direct;
      reasons.push("direct_match");
    }

    const keyword = scoreKeywordMatch(prompt, execution.toolId);
    if (keyword > 0) {
      score += keyword;
      reasons.push("keyword");
    }

    const moduleScore = scoreModuleAware(definition, activeContext.module);
    if (moduleScore > 0) {
      score += moduleScore;
      reasons.push("module");
    }

    const entityScore = scoreEntityAware(definition, activeContext);
    if (entityScore > 0) {
      score += entityScore;
      reasons.push("entity");
    }

    const permissionScore = scorePermissionAware(
      definition,
      input.permissions,
    );
    if (permissionScore > 0) {
      score += permissionScore;
      reasons.push("permission");
    }

    const modeScore = scoreModeAware(mode, execution.toolId);
    if (modeScore > 0) {
      score += modeScore;
      reasons.push("mode");
    }

    return { execution, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected = scored
    .filter((item) => item.score >= SCORE_THRESHOLD)
    .slice(0, MAX_SELECTED);

  if (selected.length === 0) {
    return {
      selectedTools: [],
      routingReason: "no tool met routing confidence threshold",
      confidence: 0,
    };
  }

  const top = selected[0]!;
  const maxPossible = 8 + 5 + 3 + 4 + 2 + 4;
  const confidence = Math.min(1, Math.max(0, top.score / maxPossible));

  const reasonParts = selected.map(
    (item) =>
      `${item.execution.toolId}(${item.reasons.join("+") || "score"}:${item.score})`,
  );

  return {
    selectedTools: Object.freeze(selected.map((item) => item.execution)),
    routingReason: `routed: ${reasonParts.join(", ")}`,
    confidence: Number(confidence.toFixed(3)),
  };
}
