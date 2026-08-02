/**
 * Enterprise workflow definition kinds and templates.
 * Planning metadata only — never executes.
 */

export type AiWorkflowKind =
  | "sequential"
  | "conditional"
  | "parallel"
  | "approval"
  | "background"
  | "human-in-the-loop";

export interface AiWorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly kind: AiWorkflowKind;
  readonly version: string;
  readonly description: string;
}

export function formatWorkflowKind(kind: AiWorkflowKind): string {
  switch (kind) {
    case "sequential":
      return "Sequential";
    case "conditional":
      return "Conditional";
    case "parallel":
      return "Parallel";
    case "approval":
      return "Approval";
    case "background":
      return "Background";
    case "human-in-the-loop":
      return "Human-in-the-loop";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function sanitize(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function resolveWorkflowDefinition(input: {
  readonly requiresApproval: boolean;
  readonly riskLevel: "low" | "medium" | "high";
  readonly stepCount: number;
  readonly fallback: boolean;
  readonly priority: "low" | "medium" | "high" | "critical";
}): AiWorkflowDefinition {
  let kind: AiWorkflowKind = "sequential";

  if (input.requiresApproval || input.priority === "critical") {
    kind = input.riskLevel === "high" ? "human-in-the-loop" : "approval";
  } else if (input.stepCount >= 5 && input.riskLevel === "low") {
    kind = "parallel";
  } else if (input.riskLevel === "medium" || input.riskLevel === "high") {
    kind = "conditional";
  } else if (input.fallback) {
    kind = "background";
  }

  return Object.freeze({
    id: `wf.orch.${kind}`,
    name: sanitize(`${formatWorkflowKind(kind)} Workflow`),
    kind,
    version: "1.0",
    description: sanitize(
      `Enterprise ${formatWorkflowKind(kind).toLowerCase()} workflow plan (no execution)`,
    ),
  });
}

export function sanitizeWorkflowText(value: string, max = 160): string {
  return sanitize(value, max);
}
