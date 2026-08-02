/**
 * Action preconditions — planning gates only.
 * Never executes.
 */

export interface AiActionPrecondition {
  readonly id: string;
  readonly label: string;
  readonly satisfied: boolean;
  readonly required: boolean;
}

function sanitize(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildActionPreconditions(input: {
  readonly hasActiveAction: boolean;
  readonly privacyMode: boolean;
  readonly fallback: boolean;
}): readonly AiActionPrecondition[] {
  return Object.freeze([
    Object.freeze({
      id: "pre.action.resolved",
      label: sanitize("Active action resolved"),
      satisfied: input.hasActiveAction,
      required: true,
    }),
    Object.freeze({
      id: "pre.privacy.clear",
      label: sanitize("Privacy mode allows planning detail"),
      satisfied: !input.privacyMode,
      required: false,
    }),
    Object.freeze({
      id: "pre.specialized.action",
      label: sanitize("Specialized (non-fallback) action"),
      satisfied: !input.fallback,
      required: false,
    }),
    Object.freeze({
      id: "pre.no.execution",
      label: sanitize("Planning-only — execution disabled"),
      satisfied: true,
      required: true,
    }),
  ]);
}
