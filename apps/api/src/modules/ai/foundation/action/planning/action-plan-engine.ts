/**
 * Action Plan Engine — build immutable plans from resolved actions.
 * Never executes. Never calls services. Never invokes tools.
 */

import type { AiActiveAction } from "../ai-action.js";
import type { AiActionContext } from "../action-context.js";
import type { AiActionPlan } from "./ai-action-plan.js";
import {
  buildActionGoals,
  buildActionPlanContainer,
} from "./action-plan.js";
import { buildActionSteps } from "./action-step.js";
import { buildActionDependencies } from "./action-dependency.js";
import { buildActionSequence } from "./action-sequence.js";
import { buildActionPreconditions } from "./action-preconditions.js";
import { buildActionPostconditions } from "./action-postconditions.js";
import { buildActionEstimation } from "./action-estimation.js";
import {
  buildActionPlanRisks,
  resolveOverallRiskLevel,
} from "./action-risk.js";
import { resolveActionPlanPriority } from "./action-priority.js";
import { buildActionApproval } from "./action-approval.js";
import { buildActionSafety } from "./action-safety.js";
import { buildActionRollbackPlan } from "./action-rollback-plan.js";
import { buildActionDryRun } from "./action-dry-run.js";
import { validateActionPlan } from "./action-validation.js";

export interface ResolveActionPlanInput {
  readonly activeAction?: AiActiveAction | null;
  readonly actionContext?: AiActionContext | null;
  readonly privacyMode?: boolean;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.4;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

function sanitize(value: string, max = 200): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function scorePlanConfidence(input: {
  readonly hasAction: boolean;
  readonly actionConfidence: number;
  readonly stepCount: number;
  readonly valid: boolean;
  readonly fallback: boolean;
}): number {
  if (!input.hasAction) return 0.3;
  let score = 0.4 + input.actionConfidence * 0.4;
  score += Math.min(0.12, input.stepCount * 0.02);
  if (input.valid) score += 0.08;
  if (input.fallback) score -= 0.15;
  return clampConfidence(score);
}

/**
 * Resolve an immutable Action Plan from the active action.
 */
export function resolveActionPlan(
  input: ResolveActionPlanInput,
): AiActionPlan {
  const privacyMode = input.privacyMode === true;
  const action = input.activeAction ?? null;
  const context = input.actionContext ?? null;

  const actionName = action?.name ?? "Generic Action";
  const category = action?.category ?? "generic";
  const capabilities = action?.capabilities ?? [];
  const fallback = action?.fallback ?? true;
  const actionConfidence = action?.confidence ?? 0.35;

  if (privacyMode) {
    const goals = Object.freeze(["Withhold detailed planning in privacy mode"]);
    const steps = buildActionSteps({
      actionName: "Privacy Action",
      capabilities: [],
      fallback: true,
      requiresApproval: false,
    });
    const dependencies = buildActionDependencies({
      steps,
      requiresApproval: false,
    });
    const sequence = buildActionSequence(steps);
    const plan = buildActionPlanContainer({
      actionName: "Privacy Action",
      goals,
      steps,
      dependencies,
      sequence,
    });
    const preconditions = buildActionPreconditions({
      hasActiveAction: Boolean(action),
      privacyMode: true,
      fallback: true,
    });
    const postconditions = buildActionPostconditions({
      actionName: "Privacy Action",
      stepCount: steps.length,
      requiresApproval: false,
    });
    const estimation = buildActionEstimation({
      stepCount: steps.length,
      requiresApproval: false,
      fallback: true,
      priority: "low",
    });
    const risks = buildActionPlanRisks({
      priority: "low",
      fallback: true,
      stepCount: steps.length,
      requiresApproval: false,
    });
    const approval = buildActionApproval({
      priority: "low",
      riskLevel: "low",
      fallback: true,
    });
    const validation = validateActionPlan({
      steps,
      dependencies,
      preconditions,
      goals,
    });

    return Object.freeze({
      plan,
      preconditions,
      postconditions,
      estimation,
      risks,
      riskLevel: resolveOverallRiskLevel(risks),
      priority: "low" as const,
      confidence: 0,
      approval,
      safety: buildActionSafety({ privacyMode: true }),
      rollback: buildActionRollbackPlan({
        stepCount: steps.length,
        requiresApproval: false,
      }),
      dryRun: buildActionDryRun({
        stepCount: steps.length,
        requiresApproval: false,
        privacyMode: true,
        fallback: true,
      }),
      validation,
      summary: sanitize("Action planning withheld in privacy mode."),
      notes: Object.freeze(["privacy-mode", "planning-only"]),
    });
  }

  const priority = resolveActionPlanPriority({
    fallback,
    confidence: actionConfidence,
    category,
  });

  // Preliminary approval need from priority alone (refined after risks).
  let requiresApproval =
    priority === "high" || priority === "critical";

  const goals = buildActionGoals({
    actionName,
    category,
    capabilities: [...capabilities],
    fallback,
  });

  const steps = buildActionSteps({
    actionName,
    capabilities: [...capabilities],
    fallback,
    requiresApproval,
  });

  const preliminaryRisks = buildActionPlanRisks({
    priority,
    fallback,
    stepCount: steps.length,
    requiresApproval,
  });
  const riskLevel = resolveOverallRiskLevel(preliminaryRisks);
  const approval = buildActionApproval({
    priority,
    riskLevel,
    fallback,
  });
  requiresApproval = approval.required;

  // Rebuild steps if approval requirement changed.
  const finalSteps =
    requiresApproval ===
    steps.some((s) => s.id === "step.approve")
      ? steps
      : buildActionSteps({
          actionName,
          capabilities: [...capabilities],
          fallback,
          requiresApproval,
        });

  const dependencies = buildActionDependencies({
    steps: finalSteps,
    requiresApproval,
  });
  const sequence = buildActionSequence(finalSteps);
  const plan = buildActionPlanContainer({
    actionName,
    goals,
    steps: finalSteps,
    dependencies,
    sequence,
  });

  const preconditions = buildActionPreconditions({
    hasActiveAction: Boolean(action),
    privacyMode: false,
    fallback,
  });
  const postconditions = buildActionPostconditions({
    actionName,
    stepCount: finalSteps.length,
    requiresApproval,
  });
  const estimation = buildActionEstimation({
    stepCount: finalSteps.length,
    requiresApproval,
    fallback,
    priority,
  });
  const risks = buildActionPlanRisks({
    priority,
    fallback,
    stepCount: finalSteps.length,
    requiresApproval,
  });
  const finalRiskLevel = resolveOverallRiskLevel(risks);
  const safety = buildActionSafety({ privacyMode: false });
  const rollback = buildActionRollbackPlan({
    stepCount: finalSteps.length,
    requiresApproval,
  });
  const dryRun = buildActionDryRun({
    stepCount: finalSteps.length,
    requiresApproval,
    privacyMode: false,
    fallback,
  });
  const validation = validateActionPlan({
    steps: finalSteps,
    dependencies,
    preconditions,
    goals,
  });

  const confidence = scorePlanConfidence({
    hasAction: Boolean(action),
    actionConfidence,
    stepCount: finalSteps.length,
    valid: validation.valid,
    fallback,
  });

  const summary = sanitize(
    fallback
      ? `Fallback plan for ${actionName}: ${finalSteps.length} steps, priority ${priority}`
      : `Action plan for ${actionName}: ${finalSteps.length} steps, risk ${finalRiskLevel}, priority ${priority}`,
  );

  const notes: string[] = [
    `plan:${plan.id}`,
    `action:${action?.id ?? "none"}`,
    `steps:${finalSteps.length}`,
    `priority:${priority}`,
    `risk:${finalRiskLevel}`,
    `approval:${approval.level}`,
    `executable:no`,
  ];
  if (context?.sources?.length) {
    notes.push(`sources:${context.sources.slice(0, 4).join("+")}`);
  }

  return Object.freeze({
    plan,
    preconditions,
    postconditions,
    estimation,
    risks,
    riskLevel: finalRiskLevel,
    priority,
    confidence,
    approval,
    safety,
    rollback,
    dryRun,
    validation,
    summary,
    notes: Object.freeze(
      [...new Set(notes.map((n) => sanitize(n, 80)))].slice(0, 12),
    ),
  });
}

export const actionPlanEngine = Object.freeze({
  resolve: resolveActionPlan,
});
