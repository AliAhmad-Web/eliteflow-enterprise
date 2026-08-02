/**
 * Business insights — safe interpretive findings.
 */

export type AiBusinessInsightKind =
  | "workload"
  | "progress"
  | "finance"
  | "attention"
  | "general";

export interface AiBusinessInsight {
  readonly kind: AiBusinessInsightKind;
  readonly text: string;
}

export function formatBusinessInsightKind(
  kind: AiBusinessInsightKind,
): string {
  switch (kind) {
    case "workload":
      return "Workload";
    case "progress":
      return "Progress";
    case "finance":
      return "Finance";
    case "attention":
      return "Attention";
    case "general":
      return "General";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
