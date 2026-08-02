/**
 * Action approval requirements — planning metadata only.
 * Never executes and never notifies approvers.
 */

export type AiActionApprovalLevel = "none" | "optional" | "required";

export interface AiActionApproval {
  readonly level: AiActionApprovalLevel;
  readonly required: boolean;
  readonly reason: string;
  readonly gates: readonly string[];
}

export function formatActionApprovalLevel(
  level: AiActionApprovalLevel,
): string {
  switch (level) {
    case "none":
      return "None";
    case "optional":
      return "Optional";
    case "required":
      return "Required";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

function sanitize(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildActionApproval(input: {
  readonly priority: "low" | "medium" | "high" | "critical";
  readonly riskLevel: "low" | "medium" | "high";
  readonly fallback: boolean;
}): AiActionApproval {
  const required =
    input.priority === "critical" ||
    input.priority === "high" ||
    input.riskLevel === "high";

  const level: AiActionApprovalLevel = required
    ? "required"
    : input.priority === "medium" || input.riskLevel === "medium"
      ? "optional"
      : "none";

  const gates: string[] = [];
  if (required) gates.push("human-approval");
  if (input.riskLevel === "high") gates.push("risk-review");
  if (input.fallback) gates.push("clarify-intent");

  return Object.freeze({
    level,
    required,
    reason: sanitize(
      required
        ? "High priority or elevated risk requires human approval before execution"
        : level === "optional"
          ? "Optional confirmation recommended before execution"
          : "No approval gate for planning-only metadata",
    ),
    gates: Object.freeze(gates),
  });
}
