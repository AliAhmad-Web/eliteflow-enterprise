/**
 * Execution resources — capacity/role metadata for the plan.
 */

import { sanitizeExecutionText } from "./execution-summary.js";

export type AiBusinessExecutionResourceKind =
  | "owner"
  | "operator"
  | "reviewer"
  | "tooling";

export interface AiBusinessExecutionResource {
  readonly id: string;
  readonly kind: AiBusinessExecutionResourceKind;
  readonly label: string;
}

export function formatExecutionResourceKind(
  kind: AiBusinessExecutionResourceKind,
): string {
  switch (kind) {
    case "owner":
      return "Owner";
    case "operator":
      return "Operator";
    case "reviewer":
      return "Reviewer";
    case "tooling":
      return "Tooling";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function buildExecutionResources(input: {
  readonly priority: "low" | "medium" | "high" | "critical";
  readonly recommendationCount: number;
}): readonly AiBusinessExecutionResource[] {
  const resources: AiBusinessExecutionResource[] = [
    {
      id: "res.owner",
      kind: "owner",
      label: "Business owner for plan approval",
    },
    {
      id: "res.operator",
      kind: "operator",
      label: sanitizeExecutionText(
        `Operators for ${input.recommendationCount} recommendation follow-ups`,
      ),
    },
    {
      id: "res.tooling",
      kind: "tooling",
      label: "Tool Execution stages for permitted actions",
    },
  ];

  if (input.priority === "critical" || input.priority === "high") {
    resources.push({
      id: "res.reviewer",
      kind: "reviewer",
      label: "Reviewer for high-priority confirmation gates",
    });
  }

  return Object.freeze(
    resources.map((item) =>
      Object.freeze({
        ...item,
        label: sanitizeExecutionText(item.label, 100),
      }),
    ),
  );
}
