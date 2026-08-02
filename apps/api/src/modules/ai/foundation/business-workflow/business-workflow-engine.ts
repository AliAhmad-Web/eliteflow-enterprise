/**
 * Business Workflow Engine — convert actions into structured workflows.
 * Never executes. Never modifies database. Never calls services.
 * Never bypasses Tool Execution.
 */

import type { AiBusinessAction } from "../business-action/business-action.js";
import type { AiBusinessWorkflow } from "./business-workflow.js";
import type { AiBusinessWorkflowStatus } from "./business-workflow.js";
import {
  resolveWorkflowDefinition,
  sanitizeWorkflowText,
} from "./business-workflow-definition.js";
import { buildWorkflowSteps } from "./business-workflow-steps.js";
import { buildWorkflowTransitions } from "./business-workflow-transitions.js";
import { buildWorkflowConditions } from "./business-workflow-permissions.js";
import { scoreBusinessWorkflowConfidence } from "./business-workflow-confidence.js";
import { buildBusinessWorkflowSummary } from "./business-workflow-summary.js";

export interface ResolveBusinessWorkflowInput {
  readonly businessAction?: AiBusinessAction | null;
  readonly privacyMode?: boolean;
}

function resolveWorkflowStatus(input: {
  readonly executable: boolean;
  readonly requiresConfirmation: boolean;
  readonly kind: string;
  readonly blockedConditions: number;
}): AiBusinessWorkflowStatus {
  if (input.kind === "idle") return "idle";
  if (input.blockedConditions > 0 && !input.executable) return "blocked";
  if (input.requiresConfirmation) return "ready";
  if (input.executable) return "ready";
  return "planned";
}

/**
 * Resolve an immutable Business Workflow from an existing Business Action.
 */
export function resolveBusinessWorkflow(
  input: ResolveBusinessWorkflowInput,
): AiBusinessWorkflow {
  const action = input.businessAction ?? null;
  const privacyMode = input.privacyMode === true;
  const definition = resolveWorkflowDefinition(action?.kind ?? "none");

  const requiresConfirmation =
    action?.permissions.requiresConfirmation ?? false;
  const executable = (action?.plan.executable ?? false) && !privacyMode;

  const steps = buildWorkflowSteps({
    actionSteps: action?.plan.steps ?? [],
    requiresConfirmation,
    executable,
  });

  const transitions = buildWorkflowTransitions({
    steps,
    requiresConfirmation,
  });

  const conditions = buildWorkflowConditions({
    executable,
    requiresConfirmation,
    permissionRequirement: action?.permissions.requirement ?? "none",
    stepCount: steps.length,
    privacyMode,
  });

  const satisfiedConditionCount = conditions.filter((c) => c.satisfied).length;
  const blockedConditions = conditions.filter((c) => !c.satisfied).length;

  const status = resolveWorkflowStatus({
    executable,
    requiresConfirmation,
    kind: definition.kind,
    blockedConditions,
  });

  const confidence = scoreBusinessWorkflowConfidence({
    hasAction: Boolean(action),
    actionConfidence: action?.confidence ?? 0,
    stepCount: steps.length,
    transitionCount: transitions.length,
    satisfiedConditionCount,
    conditionCount: conditions.length,
    executable,
  });

  const summary = buildBusinessWorkflowSummary({
    kind: definition.kind,
    stepCount: steps.length,
    transitionCount: transitions.length,
    executable,
    actionSummary: action?.summary,
  });

  const notes: string[] = [
    `workflow:${definition.id}`,
    `status:${status}`,
    `steps:${steps.length}`,
    `transitions:${transitions.length}`,
    `conditions:${satisfiedConditionCount}/${conditions.length}`,
    `executable:${executable ? "yes" : "no"}`,
  ];
  if (action?.kind) notes.push(`action-kind:${action.kind}`);
  if (action?.priority) notes.push(`action-priority:${action.priority}`);

  return Object.freeze({
    definition,
    status,
    steps,
    transitions,
    conditions,
    confidence,
    summary: sanitizeWorkflowText(summary, 240),
    notes: Object.freeze(
      [...new Set(notes.map((n) => sanitizeWorkflowText(n, 80)))].slice(0, 12),
    ),
  });
}

export const businessWorkflowEngine = Object.freeze({
  resolve: resolveBusinessWorkflow,
});
