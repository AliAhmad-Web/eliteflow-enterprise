/**
 * Business Workflow conditions — gates that control readiness.
 */

export type AiBusinessWorkflowConditionKind =
  | "permission_ok"
  | "confirmation_required"
  | "executable"
  | "privacy_clear"
  | "has_steps";

export interface AiBusinessWorkflowCondition {
  readonly kind: AiBusinessWorkflowConditionKind;
  readonly satisfied: boolean;
  readonly label: string;
}

export function formatBusinessWorkflowConditionKind(
  kind: AiBusinessWorkflowConditionKind,
): string {
  switch (kind) {
    case "permission_ok":
      return "Permission OK";
    case "confirmation_required":
      return "Confirmation Required";
    case "executable":
      return "Executable";
    case "privacy_clear":
      return "Privacy Clear";
    case "has_steps":
      return "Has Steps";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function buildWorkflowConditions(input: {
  readonly executable: boolean;
  readonly requiresConfirmation: boolean;
  readonly permissionRequirement: "read" | "write" | "approve" | "none";
  readonly stepCount: number;
  readonly privacyMode: boolean;
}): readonly AiBusinessWorkflowCondition[] {
  return Object.freeze([
    Object.freeze({
      kind: "privacy_clear" as const,
      satisfied: !input.privacyMode,
      label: input.privacyMode
        ? "Privacy mode blocks workflow execution"
        : "Privacy mode clear",
    }),
    Object.freeze({
      kind: "permission_ok" as const,
      satisfied: input.permissionRequirement !== "approve" || input.requiresConfirmation,
      label:
        input.permissionRequirement === "none"
          ? "No elevated permission required"
          : `Permission gate: ${input.permissionRequirement}`,
    }),
    Object.freeze({
      kind: "confirmation_required" as const,
      satisfied: !input.requiresConfirmation,
      label: input.requiresConfirmation
        ? "User confirmation required before tools"
        : "No confirmation gate",
    }),
    Object.freeze({
      kind: "executable" as const,
      satisfied: input.executable,
      label: input.executable
        ? "Workflow marked executable via tools"
        : "Workflow is advisory only",
    }),
    Object.freeze({
      kind: "has_steps" as const,
      satisfied: input.stepCount > 0,
      label:
        input.stepCount > 0
          ? `${input.stepCount} workflow step(s) defined`
          : "No workflow steps",
    }),
  ]);
}
