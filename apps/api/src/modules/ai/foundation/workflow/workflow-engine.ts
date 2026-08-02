/**
 * Workflow Engine — assemble workflow plan from action plan signals.
 * Never executes. Never calls services. Never invokes tools.
 */

import type { AiActionPlan } from "../action/planning/ai-action-plan.js";
import type { AiWorkflowPlan } from "./workflow-instance.js";
import { resolveWorkflowDefinition } from "./workflow-definition.js";
import { sanitizeWorkflowText } from "./workflow-definition.js";
import { buildWorkflowSteps } from "./workflow-step.js";
import { buildWorkflowTransitions } from "./workflow-transition.js";
import { buildWorkflowConditions } from "./workflow-condition.js";
import { buildWorkflowState } from "./workflow-state.js";
import { buildWorkflowContext } from "./workflow-context.js";
import { buildWorkflowMetadata } from "./workflow-metadata.js";
import { buildWorkflowQueue } from "./workflow-queue.js";
import { validateWorkflowPlan } from "./workflow-validator.js";
import { buildWorkflowSummary } from "./workflow-summary.js";

export interface ResolveWorkflowPlanInput {
  readonly actionPlan?: AiActionPlan | null;
  readonly privacyMode?: boolean;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.35;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

/**
 * Resolve an immutable workflow plan from an action plan.
 */
export function resolveWorkflowPlan(
  input: ResolveWorkflowPlanInput,
): AiWorkflowPlan {
  const privacyMode = input.privacyMode === true;
  const actionPlan = input.actionPlan ?? null;

  if (privacyMode || !actionPlan) {
    const definition = resolveWorkflowDefinition({
      requiresApproval: false,
      riskLevel: "low",
      stepCount: 0,
      fallback: true,
      priority: "low",
    });
    const steps = buildWorkflowSteps({
      actionStepIds: [],
      actionStepNames: [],
      kind: "background",
      requiresApproval: false,
    });
    const transitions = buildWorkflowTransitions(steps);
    const conditions = buildWorkflowConditions({
      hasActionPlan: Boolean(actionPlan),
      planValid: false,
      privacyMode,
      requiresApproval: false,
    });
    const waitingStates = Object.freeze(
      steps.filter((s) => s.waiting).map((s) => s.id),
    );
    const state = buildWorkflowState({
      hasPlan: Boolean(actionPlan),
      blocked: true,
      waitingStepIds: waitingStates,
      kind: definition.kind,
    });
    const validation = validateWorkflowPlan({
      steps,
      transitions,
      conditions,
    });

    return Object.freeze({
      definition: Object.freeze({
        ...definition,
        kind: "background" as const,
        id: "wf.orch.idle",
        name: "Idle Workflow",
        description: sanitizeWorkflowText(
          privacyMode
            ? "Workflow orchestration withheld in privacy mode"
            : "No action plan available for orchestration",
        ),
      }),
      steps,
      transitions,
      conditions,
      state,
      context: buildWorkflowContext({
        priority: "low",
        riskLevel: "low",
        sources: Object.freeze([privacyMode ? "privacy" : "empty"]),
      }),
      metadata: buildWorkflowMetadata({ kind: "background" }),
      queue: buildWorkflowQueue(steps),
      validation,
      confidence: 0,
      summary: sanitizeWorkflowText(
        privacyMode
          ? "Workflow orchestration withheld in privacy mode."
          : "Idle workflow plan — awaiting action plan.",
      ),
      notes: Object.freeze([
        privacyMode ? "privacy-mode" : "no-action-plan",
        "planning-only",
      ]),
      retries: Object.freeze({ enabled: false, maxAttempts: 0 }),
      waitingStates,
    });
  }

  const requiresApproval = actionPlan.approval.required;
  const definition = resolveWorkflowDefinition({
    requiresApproval,
    riskLevel: actionPlan.riskLevel,
    stepCount: actionPlan.plan.steps.length,
    fallback: actionPlan.dryRun.blockedReasons.includes("fallback-action"),
    priority: actionPlan.priority,
  });

  const actionStepIds = actionPlan.plan.steps.map((s) => s.id);
  const actionStepNames = actionPlan.plan.steps.map((s) => s.name);

  const steps = buildWorkflowSteps({
    actionStepIds,
    actionStepNames,
    kind: definition.kind,
    requiresApproval,
  });
  const transitions = buildWorkflowTransitions(steps);
  const conditions = buildWorkflowConditions({
    hasActionPlan: true,
    planValid: actionPlan.validation.valid,
    privacyMode: false,
    requiresApproval,
  });
  const waitingStates = Object.freeze(
    steps.filter((s) => s.waiting).map((s) => s.id),
  );
  const blocked = conditions.some((c) => c.required && !c.satisfied);
  const state = buildWorkflowState({
    hasPlan: true,
    blocked,
    waitingStepIds: waitingStates,
    kind: definition.kind,
  });
  const context = buildWorkflowContext({
    actionPlanId: actionPlan.plan.id,
    actionName: actionPlan.plan.name,
    priority: actionPlan.priority,
    riskLevel: actionPlan.riskLevel,
    sources: Object.freeze(["action-plan"]),
  });
  const metadata = buildWorkflowMetadata({ kind: definition.kind });
  const queue = buildWorkflowQueue(steps);
  const validation = validateWorkflowPlan({
    steps,
    transitions,
    conditions,
  });

  const confidence = clampConfidence(
    0.35 +
      actionPlan.confidence * 0.45 +
      Math.min(0.1, steps.length * 0.015) +
      (validation.valid ? 0.08 : 0),
  );

  const summary = buildWorkflowSummary({
    kind: definition.kind,
    stepCount: steps.length,
    transitionCount: transitions.length,
    waitingCount: waitingStates.length,
    actionName: actionPlan.plan.name,
  });

  const notes = Object.freeze(
    [
      `workflow:${definition.id}`,
      `kind:${definition.kind}`,
      `steps:${steps.length}`,
      `transitions:${transitions.length}`,
      `waiting:${waitingStates.length}`,
      `executable:no`,
      `action-plan:${actionPlan.plan.id}`,
    ].map((n) => sanitizeWorkflowText(n, 80)),
  );

  const maxAttempts =
    definition.kind === "background" ? 3 : metadata.supportsRetries ? 1 : 0;

  return Object.freeze({
    definition,
    steps,
    transitions,
    conditions,
    state,
    context,
    metadata,
    queue,
    validation,
    confidence,
    summary,
    notes,
    retries: Object.freeze({
      enabled: maxAttempts > 0,
      maxAttempts,
    }),
    waitingStates,
  });
}

export const workflowEngine = Object.freeze({
  resolve: resolveWorkflowPlan,
});
