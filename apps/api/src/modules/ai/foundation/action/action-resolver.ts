/**
 * Enterprise AI Action Resolver.
 * Selects the active action from registry + runtime signals. Never executes.
 * Never calls services. Falls back to Generic Action when no match exists.
 */

import type { AiActionDefinition } from "./action-definition.js";
import {
  DEFAULT_GENERIC_ACTION_ID,
  type AiActiveAction,
} from "./ai-action.js";
import {
  enterpriseActionRegistry,
  type AiActionRegistry,
} from "./action-registry.js";
import { toActiveActionSummary } from "./action-capabilities.js";
import { GENERIC_ACTION } from "./builtin-actions.js";
import {
  resolveActionEntityHints,
  resolveActionIntentHints,
  type AiActionResolutionInput,
} from "./action-context.js";

export interface ResolveActiveActionInput extends AiActionResolutionInput {
  readonly registry?: AiActionRegistry;
  /** Explicit action id hint (optional). */
  readonly actionId?: string | null;
}

export interface ResolveActiveActionResult {
  readonly activeAction: AiActiveAction;
  readonly sources: readonly string[];
}

interface ScoredAction {
  readonly action: AiActionDefinition;
  readonly score: number;
  readonly reasons: string[];
  readonly sources: string[];
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

function sanitizeReason(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, 120);
}

function scoreAction(
  action: AiActionDefinition,
  input: ResolveActiveActionInput,
  intentHints: readonly string[],
  entityTypes: readonly string[],
): ScoredAction {
  // Priority is a weak tiebreaker only — unmatched actions must not win.
  let score = action.priority / 1000;
  const reasons: string[] = [];
  const sources: string[] = [];

  // Context — active module key
  const moduleKey = input.activeContext.module?.toLowerCase() ?? "";
  if (
    moduleKey &&
    action.moduleKeys?.some((key) => key.toLowerCase() === moduleKey)
  ) {
    score += 0.35;
    reasons.push(`context-module:${action.name}`);
    sources.push("context");
  }

  // Prefer actions whose category aligns with the active module key.
  if (
    moduleKey &&
    (action.category === moduleKey ||
      `${action.category}s` === moduleKey ||
      moduleKey === action.category.replace(/s$/, "") ||
      moduleKey.startsWith(action.category))
  ) {
    score += 0.22;
    reasons.push(`category-module:${action.name}`);
    sources.push("context");
  }

  // Context — surface
  const surface = input.activeContext.surface?.toUpperCase() ?? "";
  if (
    surface &&
    surface !== "UNKNOWN" &&
    action.surfaces?.some((item) => item.toUpperCase() === surface)
  ) {
    score += 0.12;
    reasons.push(`surface:${action.name}`);
    sources.push("context");
  }

  // Agent
  const agentType = input.activeAgent?.type?.toLowerCase() ?? "";
  if (
    agentType &&
    action.preferredAgentTypes?.some(
      (item) => item.toLowerCase() === agentType,
    )
  ) {
    score += 0.2;
    reasons.push(`agent:${action.name}`);
    sources.push("agent");
  }

  // Business Query — module id / name
  const queryModuleId = input.businessQuery?.moduleId?.toLowerCase() ?? "";
  if (queryModuleId) {
    const matchesModuleId =
      action.id.toLowerCase().includes(queryModuleId.replace(/^module\./, "")) ||
      action.moduleKeys?.some(
        (key) =>
          key.toLowerCase() === queryModuleId ||
          `module.${key}`.toLowerCase() === queryModuleId,
      );
    if (matchesModuleId) {
      score += 0.4;
      reasons.push(`business-query-module:${action.name}`);
      sources.push("query");
    }
  }

  const queryModuleName =
    input.businessQuery?.moduleName?.toLowerCase() ?? "";
  if (
    queryModuleName &&
    (action.name.toLowerCase().includes(queryModuleName) ||
      action.category.toLowerCase() === queryModuleName ||
      action.moduleKeys?.some((key) => key.toLowerCase() === queryModuleName))
  ) {
    score += 0.3;
    reasons.push(`business-query-name:${action.name}`);
    sources.push("query");
  }

  // Business Query — intent
  const queryIntent = input.businessQuery?.intent?.toLowerCase() ?? "";
  if (
    queryIntent &&
    action.supportedIntents.some(
      (intent) => intent.toLowerCase() === queryIntent,
    )
  ) {
    score += 0.18;
    reasons.push(`intent:${action.name}`);
    sources.push("intent");
  }

  // Module selection
  for (const selected of input.selectedModules?.modules ?? []) {
    const selectedId = selected.id.toLowerCase();
    const selectedName = selected.name.toLowerCase();
    const hit =
      action.moduleKeys?.some(
        (key) =>
          key.toLowerCase() === selectedName ||
          `module.${key}`.toLowerCase() === selectedId,
      ) ||
      action.category.toLowerCase() === selectedName ||
      action.name.toLowerCase().includes(selectedName);
    if (hit) {
      score += 0.28;
      reasons.push(`module:${action.name}`);
      sources.push("module");
      break;
    }
  }

  // Entity types
  for (const entity of entityTypes) {
    if (
      action.supportedEntities.some(
        (supported) =>
          supported.toLowerCase() === entity ||
          entity.includes(supported.toLowerCase()),
      )
    ) {
      score += 0.25;
      reasons.push(`entity:${action.name}`);
      sources.push("context");
      break;
    }
  }

  // Soft intent / prompt keywords
  for (const hint of intentHints) {
    const categoryHit =
      action.category.toLowerCase() === hint ||
      `${action.category}s` === hint ||
      hint === action.category.replace(/s$/, "");
    const hit =
      categoryHit ||
      action.name.toLowerCase().includes(hint) ||
      action.moduleKeys?.some((key) => key.toLowerCase() === hint) ||
      action.supportedEntities.some((entity) =>
        entity.toLowerCase() === hint,
      ) ||
      action.supportedIntents.some((intent) =>
        intent.toLowerCase() === hint,
      );
    if (hit) {
      score += categoryHit ? 0.2 : 0.12;
      reasons.push(`hint:${action.name}`);
      sources.push("intent");
      break;
    }
  }

  return {
    action,
    score,
    reasons: reasons.map(sanitizeReason),
    sources: [...new Set(sources)],
  };
}

/**
 * Resolve the active action for this request.
 * Falls back to the Generic Action when no match exists.
 */
export function resolveActiveAction(
  input: ResolveActiveActionInput,
): ResolveActiveActionResult {
  const registry = input.registry ?? enterpriseActionRegistry;
  const enabled = registry.listEnabled();

  const explicitId = input.actionId?.trim();
  if (explicitId) {
    const explicit = registry.get(explicitId);
    if (explicit && explicit.enabled !== false) {
      const activeAction = toActiveActionSummary(
        explicit,
        `explicit:${explicit.id}`,
        explicit.id === DEFAULT_GENERIC_ACTION_ID,
        explicit.id === DEFAULT_GENERIC_ACTION_ID ? 0.4 : 0.95,
      );
      return Object.freeze({
        activeAction,
        sources: Object.freeze(["explicit"]),
      });
    }
  }

  const intentHints = resolveActionIntentHints(input);
  const entityTypes = resolveActionEntityHints(input);

  let best: ScoredAction | null = null;

  for (const action of enabled) {
    if (action.id === DEFAULT_GENERIC_ACTION_ID) {
      continue; // scored only as fallback
    }
    const scored = scoreAction(action, input, intentHints, entityTypes);
    // Require at least one real resolution signal (agent/query/module/intent/context).
    if (scored.sources.length === 0 || scored.score < 0.2) continue;
    if (
      !best ||
      scored.score > best.score ||
      (scored.score === best.score &&
        action.id.localeCompare(best.action.id) < 0)
    ) {
      best = scored;
    }
  }

  if (best) {
    const confidence = clampConfidence(
      0.45 + Math.min(0.5, best.score / 2),
    );
    const activeAction = toActiveActionSummary(
      best.action,
      `matched:${best.reasons.join("+") || "priority"}:${best.score.toFixed(2)}`,
      false,
      confidence,
    );
    return Object.freeze({
      activeAction,
      sources: Object.freeze(best.sources),
    });
  }

  const generic =
    registry.get(DEFAULT_GENERIC_ACTION_ID) ??
    enabled.find((action) => action.category === "generic") ??
    GENERIC_ACTION;

  return Object.freeze({
    activeAction: toActiveActionSummary(
      generic,
      "fallback:generic",
      true,
      0.35,
    ),
    sources: Object.freeze(["fallback"]),
  });
}
