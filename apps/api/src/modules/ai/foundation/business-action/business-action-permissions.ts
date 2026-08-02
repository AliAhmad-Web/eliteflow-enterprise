/**
 * Business Action permission requirements — metadata only.
 * Never bypasses authorization; never grants access.
 */

export type AiBusinessActionPermissionRequirement =
  | "read"
  | "write"
  | "approve"
  | "none";

export interface AiBusinessActionPermissions {
  readonly requirement: AiBusinessActionPermissionRequirement;
  readonly keys: readonly string[];
  readonly requiresConfirmation: boolean;
}

export function formatBusinessActionPermissionRequirement(
  requirement: AiBusinessActionPermissionRequirement,
): string {
  switch (requirement) {
    case "read":
      return "Read";
    case "write":
      return "Write";
    case "approve":
      return "Approve";
    case "none":
      return "None";
    default: {
      const _exhaustive: never = requirement;
      return _exhaustive;
    }
  }
}

export function resolveBusinessActionPermissions(input: {
  readonly recommendationAction:
    | "prioritize_work"
    | "review_items"
    | "monitor_status"
    | "respond_now"
    | "no_action"
    | null;
  readonly requiresConfirmation: boolean;
  readonly queryModule?: string | null;
}): AiBusinessActionPermissions {
  const action = input.recommendationAction ?? "no_action";

  let requirement: AiBusinessActionPermissionRequirement;
  switch (action) {
    case "respond_now":
    case "prioritize_work":
      requirement = input.requiresConfirmation ? "approve" : "write";
      break;
    case "review_items":
      requirement = "read";
      break;
    case "monitor_status":
      requirement = "read";
      break;
    case "no_action":
      requirement = "none";
      break;
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }

  const moduleHint = input.queryModule?.trim().toLowerCase() ?? "";
  const keys: string[] = [];
  if (requirement !== "none") {
    if (moduleHint.includes("task")) keys.push("tasks:read");
    else if (moduleHint.includes("project")) keys.push("projects:read");
    else if (moduleHint.includes("finance")) keys.push("invoices:read");
    else if (moduleHint.includes("document")) keys.push("ai:use");
    else if (moduleHint.includes("calendar")) keys.push("calendar:read");
    else keys.push("ai:use");

    if (requirement === "write" || requirement === "approve") {
      keys.push("ai:use");
    }
  }

  return Object.freeze({
    requirement,
    keys: Object.freeze([...new Set(keys)]),
    requiresConfirmation:
      input.requiresConfirmation || requirement === "approve",
  });
}
