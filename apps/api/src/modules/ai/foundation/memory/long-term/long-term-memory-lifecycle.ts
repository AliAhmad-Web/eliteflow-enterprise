/**
 * Long-term memory lifecycle states.
 */

export type AiLongTermMemoryLifecycleState =
  | "candidate"
  | "active"
  | "promoted"
  | "demoted"
  | "consolidated"
  | "archived"
  | "forgotten";

export function formatLongTermMemoryLifecycleState(
  state: AiLongTermMemoryLifecycleState,
): string {
  switch (state) {
    case "candidate":
      return "Candidate";
    case "active":
      return "Active";
    case "promoted":
      return "Promoted";
    case "demoted":
      return "Demoted";
    case "consolidated":
      return "Consolidated";
    case "archived":
      return "Archived";
    case "forgotten":
      return "Forgotten";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function resolveLifecycleState(input: {
  readonly promoted: boolean;
  readonly demoted: boolean;
  readonly forgotten: boolean;
  readonly archived: boolean;
  readonly consolidated?: boolean;
}): AiLongTermMemoryLifecycleState {
  if (input.forgotten) return "forgotten";
  if (input.archived) return "archived";
  if (input.consolidated) return "consolidated";
  if (input.promoted) return "promoted";
  if (input.demoted) return "demoted";
  return "active";
}
