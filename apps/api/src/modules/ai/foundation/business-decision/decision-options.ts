/**
 * Business Decision options — candidate actions derived from reasoning.
 * Metadata only; never executes.
 */

export type AiBusinessDecisionOptionKind =
  | "prioritize"
  | "review"
  | "monitor"
  | "respond"
  | "defer";

export interface AiBusinessDecisionOption {
  readonly id: string;
  readonly kind: AiBusinessDecisionOptionKind;
  readonly label: string;
  readonly score: number;
}

export function formatBusinessDecisionOptionKind(
  kind: AiBusinessDecisionOptionKind,
): string {
  switch (kind) {
    case "prioritize":
      return "Prioritize";
    case "review":
      return "Review";
    case "monitor":
      return "Monitor";
    case "respond":
      return "Respond";
    case "defer":
      return "Defer";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function sanitizeDecisionText(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}
