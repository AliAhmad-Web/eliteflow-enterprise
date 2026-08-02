/**
 * Business Action plan — structured executable steps (never executed here).
 */

export type AiBusinessActionStepKind =
  | "inspect"
  | "prioritize"
  | "review"
  | "notify"
  | "defer"
  | "confirm";

export interface AiBusinessActionStep {
  readonly id: string;
  readonly kind: AiBusinessActionStepKind;
  readonly label: string;
  readonly order: number;
}

export interface AiBusinessActionPlan {
  readonly steps: readonly AiBusinessActionStep[];
  readonly plannedAt: string;
  readonly executable: boolean;
}

export function formatBusinessActionStepKind(
  kind: AiBusinessActionStepKind,
): string {
  switch (kind) {
    case "inspect":
      return "Inspect";
    case "prioritize":
      return "Prioritize";
    case "review":
      return "Review";
    case "notify":
      return "Notify";
    case "defer":
      return "Defer";
    case "confirm":
      return "Confirm";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function sanitizeLabel(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildBusinessActionPlan(input: {
  readonly recommendationAction:
    | "prioritize_work"
    | "review_items"
    | "monitor_status"
    | "respond_now"
    | "no_action"
    | null;
  readonly recommendationText?: string | null;
  readonly requiresConfirmation: boolean;
  readonly actionable: boolean;
}): AiBusinessActionPlan {
  const steps: AiBusinessActionStep[] = [];
  const action = input.recommendationAction ?? "no_action";
  let order = 1;

  if (input.requiresConfirmation) {
    steps.push({
      id: "step.confirm",
      kind: "confirm",
      label: "Confirm before tool execution",
      order: order++,
    });
  }

  switch (action) {
    case "respond_now":
      steps.push({
        id: "step.inspect",
        kind: "inspect",
        label: "Inspect critical business signals",
        order: order++,
      });
      steps.push({
        id: "step.prioritize",
        kind: "prioritize",
        label: sanitizeLabel(
          input.recommendationText || "Prioritize immediate follow-up",
        ),
        order: order++,
      });
      steps.push({
        id: "step.notify",
        kind: "notify",
        label: "Surface escalation to runtime tools if permitted",
        order: order++,
      });
      break;
    case "prioritize_work":
      steps.push({
        id: "step.inspect",
        kind: "inspect",
        label: "Inspect high-priority work items",
        order: order++,
      });
      steps.push({
        id: "step.prioritize",
        kind: "prioritize",
        label: sanitizeLabel(
          input.recommendationText || "Reorder work by urgency",
        ),
        order: order++,
      });
      break;
    case "review_items":
      steps.push({
        id: "step.review",
        kind: "review",
        label: sanitizeLabel(
          input.recommendationText || "Review outstanding items",
        ),
        order: order++,
      });
      break;
    case "monitor_status":
      steps.push({
        id: "step.inspect",
        kind: "inspect",
        label: "Monitor current business status",
        order: order++,
      });
      break;
    case "no_action":
      steps.push({
        id: "step.defer",
        kind: "defer",
        label: "No executable action required",
        order: order++,
      });
      break;
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      break;
    }
  }

  return Object.freeze({
    steps: Object.freeze(
      steps.map((step) =>
        Object.freeze({
          ...step,
          label: sanitizeLabel(step.label),
        }),
      ),
    ),
    plannedAt: new Date().toISOString(),
    executable: input.actionable && action !== "no_action",
  });
}
