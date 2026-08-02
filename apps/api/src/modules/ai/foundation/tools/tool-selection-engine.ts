/**
 * Enterprise Intelligent Tool Selection Engine.
 * Analyzes the user request and selects the minimum required tools.
 * Never executes tools. Never bypasses eligibility.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";
import type {
  AiToolExecution,
  AiToolId,
} from "../contracts/ai-tool-execution.js";
import {
  AI_TOOL_CATALOG,
  type AiToolDefinition,
} from "./tool-catalog.js";
import { getDeclaredDependencies } from "./tool-dependencies.js";

export interface SelectToolsInput {
  readonly userPrompt: string;
  readonly mode?: string | null;
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  /** Already-eligible executions (eligibility must already have run). */
  readonly eligibleTools: readonly AiToolExecution[];
  /**
   * When routing produced a selection, only those tools are candidates.
   * When null/undefined, all eligible tools are candidates.
   */
  readonly routedTools?: readonly AiToolExecution[] | null;
  readonly permissions?: readonly string[] | null;
  readonly catalog?: readonly AiToolDefinition[];
}

export interface AiToolSelectionDecision {
  readonly toolId: AiToolId;
  readonly selected: boolean;
  /** 0–1 confidence for this tool relative to the request. */
  readonly confidence: number;
  readonly reason: string;
}

export interface AiToolSelectionResult {
  readonly selectedTools: readonly AiToolExecution[];
  readonly decisions: readonly AiToolSelectionDecision[];
  readonly analysisSummary: string;
  /** Aggregate confidence across selected tools (0–1). */
  readonly confidence: number;
}

interface IntentSignal {
  readonly intent: string;
  readonly tools: readonly AiToolId[];
  readonly patterns: readonly string[];
  readonly weight: number;
}

const CONFIDENCE_THRESHOLD = 0.35;
const MAX_PRIMARY = 2;

const INTENT_SIGNALS: readonly IntentSignal[] = [
  {
    intent: "email",
    tools: ["draft_email"],
    patterns: [
      "email",
      "e-mail",
      "draft email",
      "compose email",
      "write email",
      "mailto",
    ],
    weight: 1,
  },
  {
    intent: "document",
    tools: ["save_ai_document"],
    patterns: [
      "save document",
      "save doc",
      "store document",
      "persist document",
    ],
    weight: 1,
  },
  {
    intent: "summarize",
    tools: ["summarize_content"],
    patterns: ["summarize", "summary", "tldr", "tl;dr", "sum up", "brief"],
    weight: 0.95,
  },
  {
    intent: "task",
    tools: ["create_task"],
    patterns: [
      "create task",
      "add task",
      "new task",
      "todo",
      "to-do",
      "assign task",
    ],
    weight: 1,
  },
  {
    intent: "calendar",
    tools: ["create_calendar_event"],
    patterns: [
      "calendar",
      "schedule",
      "meeting",
      "appointment",
      "book time",
      "event",
    ],
    weight: 1,
  },
  {
    intent: "project",
    tools: ["analyze_project"],
    patterns: [
      "analyze project",
      "project analysis",
      "project status",
      "project health",
    ],
    weight: 1,
  },
  {
    intent: "report",
    tools: ["analyze_report"],
    patterns: ["analyze report", "report analysis", "review report"],
    weight: 1,
  },
  {
    intent: "client",
    tools: ["lookup_client"],
    patterns: [
      "lookup client",
      "find client",
      "client info",
      "client details",
      "who is the client",
    ],
    weight: 1,
  },
];

const MODE_PRIMARY_TOOLS: Readonly<Record<string, readonly AiToolId[]>> = {
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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function scoreIntentMatch(prompt: string, toolId: AiToolId): {
  score: number;
  intents: string[];
} {
  let best = 0;
  const intents: string[] = [];

  for (const signal of INTENT_SIGNALS) {
    if (!signal.tools.includes(toolId)) continue;
    let hit = 0;
    for (const pattern of signal.patterns) {
      if (prompt.includes(pattern)) {
        hit = Math.max(hit, pattern.includes(" ") ? 0.9 : 0.7);
      }
    }
    if (hit > 0) {
      const weighted = hit * signal.weight;
      if (weighted > best) best = weighted;
      intents.push(signal.intent);
    }
  }

  return { score: best, intents };
}

function scoreDirectToolId(prompt: string, toolId: string): number {
  const needle = toolId.toLowerCase();
  if (!needle) return 0;
  const re = new RegExp(
    `(^|[^a-z0-9_])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9_]|$)`,
  );
  return re.test(prompt) ? 1 : 0;
}

function scoreMode(mode: string | null | undefined, toolId: string): number {
  if (!mode) return 0;
  const hints = MODE_PRIMARY_TOOLS[mode.toUpperCase()] ?? [];
  return hints.includes(toolId) ? 0.55 : 0;
}

function scoreContext(
  definition: AiToolDefinition | null,
  context: AiActiveContext,
): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 0;

  if (definition?.modules?.length && context.module) {
    if (definition.modules.includes(context.module)) {
      score += 0.15;
      notes.push("module");
    }
  }

  if (definition?.requiresEntityTypes?.length) {
    const activeTypes = new Set(
      context.entities.map((entity) => entity.type.toLowerCase()),
    );
    if (context.primaryEntity?.type) {
      activeTypes.add(context.primaryEntity.type.toLowerCase());
    }
    const matched = definition.requiresEntityTypes.some((type) =>
      activeTypes.has(type.toLowerCase()),
    );
    if (matched) {
      score += 0.2;
      notes.push("entity");
    }
  }

  return { score, notes };
}

function organizationAllows(
  definition: AiToolDefinition | null,
  context: AiActiveContext,
): boolean {
  if (!definition?.requiresOrganization) return true;
  return Boolean(
    context.organization?.organizationId ||
      context.organization?.organizationKey,
  );
}

function expandWithDependencies(
  primaryIds: readonly AiToolId[],
  eligibleById: ReadonlyMap<AiToolId, AiToolExecution>,
): AiToolId[] {
  const selected = new Set<AiToolId>(primaryIds);
  const queue = [...primaryIds];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dep of getDeclaredDependencies(current)) {
      if (selected.has(dep)) continue;
      if (!eligibleById.has(dep)) continue;
      selected.add(dep);
      queue.push(dep);
    }
  }

  // Deterministic: eligible order among expanded set
  return [...eligibleById.keys()].filter((id) => selected.has(id));
}

/**
 * Select the minimum required tools for the user request.
 * Operates only on eligible (and optionally routed) candidates.
 */
export function selectTools(input: SelectToolsInput): AiToolSelectionResult {
  const catalog = input.catalog ?? AI_TOOL_CATALOG;
  const prompt = normalizePrompt(input.userPrompt ?? "");
  const mode = input.mode ?? input.activeContext.mode;

  const eligible = input.eligibleTools.filter(
    (tool) => tool.status === "eligible",
  );
  const eligibleById = new Map(eligible.map((tool) => [tool.toolId, tool]));

  if (input.policy.privacyMode) {
    const decisions = eligible.map((tool) =>
      Object.freeze({
        toolId: tool.toolId,
        selected: false,
        confidence: 0,
        reason: "rejected:privacy_mode",
      }),
    );
    return Object.freeze({
      selectedTools: Object.freeze([]),
      decisions: Object.freeze(decisions),
      analysisSummary: "privacyMode: intelligent tool selection withheld",
      confidence: 1,
    });
  }

  const routed = input.routedTools ?? null;
  const candidates =
    routed !== null
      ? routed.filter(
          (tool) =>
            tool.status === "eligible" && eligibleById.has(tool.toolId),
        )
      : eligible;

  if (candidates.length === 0) {
    const decisions = eligible.map((tool) =>
      Object.freeze({
        toolId: tool.toolId,
        selected: false,
        confidence: 0,
        reason:
          routed !== null
            ? "rejected:not_in_routing_selection"
            : "rejected:no_eligible_candidates",
      }),
    );
    return Object.freeze({
      selectedTools: Object.freeze([]),
      decisions: Object.freeze(decisions),
      analysisSummary: "no candidate tools available for intelligent selection",
      confidence: 1,
    });
  }

  const candidateIds = new Set(candidates.map((tool) => tool.toolId));
  const scored = candidates.map((execution) => {
    const definition = definitionById(catalog, execution.toolId);
    const reasons: string[] = [];
    let confidence = 0;

    if (!organizationAllows(definition, input.activeContext)) {
      return {
        execution,
        confidence: 0,
        reasons: ["org_boundary"],
        intents: [] as string[],
        blocked: true as const,
      };
    }

    const direct = scoreDirectToolId(prompt, execution.toolId);
    if (direct > 0) {
      confidence += direct;
      reasons.push("direct_match");
    }

    const intent = scoreIntentMatch(prompt, execution.toolId);
    if (intent.score > 0) {
      confidence += intent.score;
      reasons.push(`intent:${intent.intents.join("+")}`);
    }

    const modeScore = scoreMode(mode, execution.toolId);
    if (modeScore > 0) {
      confidence += modeScore;
      reasons.push("mode");
    }

    const contextScore = scoreContext(definition, input.activeContext);
    if (contextScore.score > 0) {
      confidence += contextScore.score;
      reasons.push(...contextScore.notes);
    }

    if (
      definition &&
      input.permissions &&
      input.permissions.length > 0 &&
      definition.requiredPermissions.length > 0
    ) {
      const permissionSet = new Set(input.permissions);
      if (
        definition.requiredPermissions.every((key) => permissionSet.has(key))
      ) {
        confidence += 0.05;
        reasons.push("permission");
      }
    }

    confidence = clamp01(confidence);

    return {
      execution,
      confidence,
      reasons,
      intents: intent.intents,
      blocked: false as const,
    };
  });

  // Minimum covering set: strongest tool per intent, then top residuals.
  const primary: typeof scored = [];
  const claimedIntents = new Set<string>();

  const ranked = [...scored]
    .filter((item) => !item.blocked && item.confidence >= CONFIDENCE_THRESHOLD)
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.execution.toolId.localeCompare(b.execution.toolId);
    });

  for (const item of ranked) {
    if (primary.length >= MAX_PRIMARY) break;
    const novel = item.intents.filter((intent) => !claimedIntents.has(intent));
    if (item.intents.length > 0 && novel.length === 0) {
      continue; // redundant for already-covered intents
    }
    primary.push(item);
    for (const intent of item.intents) claimedIntents.add(intent);
  }

  // If nothing matched intents but mode/direct scored, keep top ranked.
  if (primary.length === 0 && ranked.length > 0) {
    primary.push(ranked[0]!);
  }

  const primaryIds = primary.map((item) => item.execution.toolId);
  // Include eligible declared dependencies so the planner can order them.
  // Never expands beyond the eligible set (eligibility is never bypassed).
  const finalIds = expandWithDependencies(primaryIds, eligibleById);

  const selectedSet = new Set(finalIds);
  const confidenceById = new Map(
    scored.map((item) => [item.execution.toolId, item.confidence]),
  );
  const reasonById = new Map(
    scored.map((item) => [item.execution.toolId, item]),
  );

  const decisions: AiToolSelectionDecision[] = [];

  // Decisions for every eligible tool (selected or rejected).
  for (const tool of eligible) {
    const scoredItem = reasonById.get(tool.toolId);
    if (selectedSet.has(tool.toolId)) {
      const isPrimary = primaryIds.includes(tool.toolId);
      const scoredConf = confidenceById.get(tool.toolId) ?? 0;
      const conf = isPrimary
        ? clamp01(Math.max(scoredConf, CONFIDENCE_THRESHOLD))
        : clamp01(Math.max(scoredConf, 0.55));
      const baseReasons = scoredItem?.reasons ?? [];
      const reason = isPrimary
        ? `selected:${baseReasons.join("+") || "request_match"}`
        : "selected:required_dependency";
      decisions.push(
        Object.freeze({
          toolId: tool.toolId,
          selected: true,
          confidence: Number(conf.toFixed(3)),
          reason,
        }),
      );
      continue;
    }

    if (!candidateIds.has(tool.toolId) && routed !== null) {
      decisions.push(
        Object.freeze({
          toolId: tool.toolId,
          selected: false,
          confidence: 0,
          reason: "rejected:not_in_routing_selection",
        }),
      );
      continue;
    }

    if (scoredItem?.blocked) {
      decisions.push(
        Object.freeze({
          toolId: tool.toolId,
          selected: false,
          confidence: 0,
          reason: "rejected:organization_boundary",
        }),
      );
      continue;
    }

    const conf = scoredItem?.confidence ?? 0;
    let reason = "rejected:not_required_for_request";
    if (conf > 0 && conf < CONFIDENCE_THRESHOLD) {
      reason = "rejected:below_confidence_threshold";
    } else if (
      scoredItem &&
      scoredItem.intents.length > 0 &&
      scoredItem.intents.every((intent) => claimedIntents.has(intent)) &&
      !primaryIds.includes(tool.toolId)
    ) {
      reason = "rejected:redundant_intent_coverage";
    } else if (scoredItem?.reasons.length) {
      reason = `rejected:insufficient_need(${scoredItem.reasons.join("+")})`;
    }

    decisions.push(
      Object.freeze({
        toolId: tool.toolId,
        selected: false,
        confidence: Number(conf.toFixed(3)),
        reason,
      }),
    );
  }

  const selectedTools = finalIds
    .map((id) => eligibleById.get(id))
    .filter((tool): tool is AiToolExecution => Boolean(tool));

  const aggregate =
    selectedTools.length === 0
      ? 0
      : selectedTools.reduce(
          (sum, tool) =>
            sum + (decisions.find((d) => d.toolId === tool.toolId)?.confidence ?? 0),
          0,
        ) / selectedTools.length;

  const summaryParts = selectedTools.map((tool) => {
    const decision = decisions.find((d) => d.toolId === tool.toolId);
    return `${tool.toolId}@${decision?.confidence ?? 0}`;
  });

  return Object.freeze({
    selectedTools: Object.freeze(selectedTools),
    decisions: Object.freeze(decisions),
    analysisSummary:
      selectedTools.length > 0
        ? `intelligent_selection: ${summaryParts.join(", ")}`
        : "intelligent_selection: no tools required",
    confidence: Number(aggregate.toFixed(3)),
  });
}

/**
 * Narrow executions to an explicit selected set (non-selected eligible → skipped).
 */
export function applyToolSelection(
  executions: readonly AiToolExecution[],
  selectedTools: readonly AiToolExecution[] | undefined,
  enforce: boolean,
): readonly AiToolExecution[] {
  if (!enforce || !selectedTools) {
    return executions;
  }

  const selectedIds = new Set(selectedTools.map((tool) => tool.toolId));

  return executions.map((execution) => {
    if (execution.status !== "eligible") {
      return execution;
    }
    if (selectedIds.has(execution.toolId)) {
      return execution;
    }
    return {
      ...execution,
      status: "skipped" as const,
      metadata: {
        ...(execution.metadata ?? {}),
        skipReason: "not_selected_by_intelligent_selection_or_routing",
      },
    };
  });
}
