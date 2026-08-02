/**
 * Business Workflow definition — named workflow template metadata.
 */

export type AiBusinessWorkflowKind =
  | "prioritize_work"
  | "review_items"
  | "monitor_status"
  | "respond_escalate"
  | "idle";

export interface AiBusinessWorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly kind: AiBusinessWorkflowKind;
  readonly version: string;
}

export function formatBusinessWorkflowKind(
  kind: AiBusinessWorkflowKind,
): string {
  switch (kind) {
    case "prioritize_work":
      return "Prioritize Work";
    case "review_items":
      return "Review Items";
    case "monitor_status":
      return "Monitor Status";
    case "respond_escalate":
      return "Respond / Escalate";
    case "idle":
      return "Idle";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function resolveWorkflowDefinition(
  actionKind: "prioritize" | "review" | "monitor" | "respond" | "none",
): AiBusinessWorkflowDefinition {
  switch (actionKind) {
    case "prioritize":
      return Object.freeze({
        id: "wf.prioritize_work",
        name: "Prioritize Work Workflow",
        kind: "prioritize_work",
        version: "1.0",
      });
    case "review":
      return Object.freeze({
        id: "wf.review_items",
        name: "Review Items Workflow",
        kind: "review_items",
        version: "1.0",
      });
    case "monitor":
      return Object.freeze({
        id: "wf.monitor_status",
        name: "Monitor Status Workflow",
        kind: "monitor_status",
        version: "1.0",
      });
    case "respond":
      return Object.freeze({
        id: "wf.respond_escalate",
        name: "Respond Escalate Workflow",
        kind: "respond_escalate",
        version: "1.0",
      });
    case "none":
      return Object.freeze({
        id: "wf.idle",
        name: "Idle Workflow",
        kind: "idle",
        version: "1.0",
      });
    default: {
      const _exhaustive: never = actionKind;
      return _exhaustive;
    }
  }
}

export function sanitizeWorkflowText(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}
