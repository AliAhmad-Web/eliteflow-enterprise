/**
 * Business Query Builder — assemble immutable AiBusinessQuery from signals.
 * Never executes. Never loads business data.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiBusinessQuery } from "./business-query.js";
import type { AiBusinessQueryOutput } from "./business-query.js";
import type { AiBusinessQueryIntent } from "./business-query-intent.js";
import {
  moduleIdForEntity,
  moduleNameForEntity,
} from "./business-query-entity.js";
import {
  priorityFromFilters,
  scopeFromFilters,
  timeRangeFromFilters,
} from "./business-query-filter.js";
import { scoreBusinessQueryConfidence } from "./business-query-confidence.js";
import { buildBusinessQueryReasons } from "./business-query-reasons.js";
import type { ParsedBusinessQuerySignals } from "./business-query-parser.js";

export interface BuildBusinessQueryInput {
  readonly signals: ParsedBusinessQuerySignals;
  readonly activeContext: AiActiveContext;
  readonly mode?: string | null;
}

function resolveOutput(
  intent: AiBusinessQueryIntent,
): AiBusinessQueryOutput {
  switch (intent) {
    case "list":
    case "open":
    case "search":
      return "list";
    case "count":
      return "count";
    case "details":
    case "review":
    case "status":
    case "progress":
      return "details";
    case "summary":
    case "analytics":
    case "insights":
    case "compare":
    case "recommendation":
      return "summary";
    default: {
      const _exhaustive: never = intent;
      return _exhaustive;
    }
  }
}

/**
 * Build a frozen business query from parsed signals + safe context.
 */
export function buildBusinessQuery(
  input: BuildBusinessQueryInput,
): AiBusinessQuery {
  const { signals, activeContext } = input;
  const entity = signals.entity;
  const filters = signals.filters;
  const moduleId = entity ? moduleIdForEntity(entity) : null;
  const moduleName = entity ? moduleNameForEntity(entity) : null;

  const scope = scopeFromFilters(filters);
  const timeRange = timeRangeFromFilters(filters);
  const priority = priorityFromFilters(filters);

  const hasCurrentUser = Boolean(activeContext.user?.userId?.trim());
  const hasOrganization = Boolean(
    activeContext.organization?.organizationId?.trim(),
  );

  const targetUser =
    scope === "current_user" || filters.includes("assigned_to_me")
      ? ("current" as const)
      : hasCurrentUser
        ? ("current" as const)
        : ("none" as const);

  const organization =
    scope === "organization" || filters.includes("organization")
      ? hasOrganization
        ? ("current" as const)
        : ("none" as const)
      : hasOrganization
        ? ("current" as const)
        : ("none" as const);

  const confidence = scoreBusinessQueryConfidence({
    hasIntent: Boolean(signals.matchedIntentKeywords.length > 0),
    hasEntity: entity !== null,
    filterCount: filters.length,
    hasModule: moduleId !== null,
  });

  const reasoning = buildBusinessQueryReasons({
    intent: signals.intent,
    entity: entity ?? undefined,
    filters,
    moduleName: moduleName ?? undefined,
    extra: [
      ...(signals.matchedIntentKeywords.length > 0
        ? ["parsed-intent"]
        : ["default-intent"]),
      ...(entity ? ["parsed-entity"] : ["no-entity"]),
      ...(input.mode?.trim()
        ? [`mode:${input.mode.trim().toLowerCase().slice(0, 24)}`]
        : []),
    ],
  });

  return Object.freeze({
    intent: signals.intent,
    entity,
    moduleId,
    moduleName,
    filters: Object.freeze([...filters]),
    timeRange,
    scope,
    targetUser,
    organization,
    priority,
    confidence,
    reasoning,
    output: resolveOutput(signals.intent),
  });
}
