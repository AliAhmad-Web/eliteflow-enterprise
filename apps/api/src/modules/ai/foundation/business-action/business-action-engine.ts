/**
 * Business Action Engine — convert decisions into structured action plans.
 * Never executes. Never modifies database. Never calls services.
 * Never bypasses Tool Execution.
 */

import type { AiBusinessDecision } from "../business-decision/business-decision.js";
import type { AiBusinessQuery } from "../business-query/business-query.js";
import type {
  AiBusinessAction,
  AiBusinessActionKind,
} from "./business-action.js";
import { buildBusinessActionPlan } from "./business-action-plan.js";
import { resolveBusinessActionPriority } from "./business-action-priority.js";
import { resolveBusinessActionRisk } from "./business-action-risk.js";
import { resolveBusinessActionPermissions } from "./business-action-permissions.js";
import { scoreBusinessActionConfidence } from "./business-action-confidence.js";
import { buildBusinessActionSummary } from "./business-action-summary.js";

export interface ResolveBusinessActionInput {
  readonly businessDecision?: AiBusinessDecision | null;
  readonly businessQuery?: AiBusinessQuery | null;
}

function sanitizeNote(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function resolveActionKind(
  recommendationAction:
    | "prioritize_work"
    | "review_items"
    | "monitor_status"
    | "respond_now"
    | "no_action"
    | null
    | undefined,
): AiBusinessActionKind {
  switch (recommendationAction) {
    case "prioritize_work":
      return "prioritize";
    case "review_items":
      return "review";
    case "monitor_status":
      return "monitor";
    case "respond_now":
      return "respond";
    case "no_action":
    case null:
    case undefined:
      return "none";
    default: {
      const _exhaustive: never = recommendationAction;
      return _exhaustive;
    }
  }
}

/**
 * Resolve an immutable Business Action from an existing Business Decision.
 */
export function resolveBusinessAction(
  input: ResolveBusinessActionInput,
): AiBusinessAction {
  const decision = input.businessDecision ?? null;
  const recommendationAction = decision?.recommendation.action ?? "no_action";
  const actionable = decision?.execution.actionable ?? false;
  const requiresConfirmation =
    decision?.execution.requiresConfirmation ?? false;

  const plan = buildBusinessActionPlan({
    recommendationAction,
    recommendationText: decision?.recommendation.text,
    requiresConfirmation,
    actionable,
  });

  const priority = resolveBusinessActionPriority({
    decisionPriority: decision?.priority ?? null,
    actionable,
  });

  const risk = resolveBusinessActionRisk({
    decisionRiskLevel: decision?.risk.level ?? null,
    requiresConfirmation,
    executionMode: decision?.execution.mode ?? null,
  });

  const permissions = resolveBusinessActionPermissions({
    recommendationAction,
    requiresConfirmation,
    queryModule: input.businessQuery?.moduleName,
  });

  const confidence = scoreBusinessActionConfidence({
    hasDecision: Boolean(decision),
    decisionConfidence: decision?.confidence ?? 0,
    stepCount: plan.steps.length,
    executable: plan.executable,
    hasPermissions: permissions.keys.length > 0 || permissions.requirement === "none",
  });

  const summary = buildBusinessActionSummary({
    stepCount: plan.steps.length,
    priority,
    riskLevel: risk.level,
    executable: plan.executable,
    recommendationText: decision?.recommendation.text,
  });

  const kind = resolveActionKind(recommendationAction);

  const notes: string[] = [
    `kind:${kind}`,
    `priority:${priority}`,
    `risk:${risk.level}`,
    `steps:${plan.steps.length}`,
    `executable:${plan.executable ? "yes" : "no"}`,
    `permission:${permissions.requirement}`,
  ];
  if (input.businessQuery?.intent) {
    notes.push(`query-intent:${input.businessQuery.intent}`);
  }
  if (decision?.execution.selectedOptionId) {
    notes.push(
      sanitizeNote(`decision-option:${decision.execution.selectedOptionId}`),
    );
  }

  return Object.freeze({
    kind,
    plan,
    priority,
    risk,
    permissions,
    confidence,
    summary: sanitizeNote(summary, 240),
    notes: Object.freeze(
      [...new Set(notes.map((n) => sanitizeNote(n)))].slice(0, 12),
    ),
  });
}

export const businessActionEngine = Object.freeze({
  resolve: resolveBusinessAction,
});
