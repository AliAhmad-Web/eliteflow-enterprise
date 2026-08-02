/**
 * n8n trigger models — webhook / manual / schedule metadata.
 */

export type AiN8nTriggerKind = "webhook" | "manual" | "schedule" | "callback";

export interface AiN8nTrigger {
  readonly kind: AiN8nTriggerKind;
  readonly path: string;
  readonly async: boolean;
}

export function buildN8nTrigger(input: {
  readonly mode: "sync" | "async" | "background" | "callback";
  readonly workflowKey: string;
}): AiN8nTrigger {
  const kind: AiN8nTriggerKind =
    input.mode === "callback"
      ? "callback"
      : input.mode === "background" || input.mode === "async"
        ? "webhook"
        : "manual";

  return Object.freeze({
    kind,
    path: `/hooks/eliteflow/${input.workflowKey}`,
    async: input.mode !== "sync",
  });
}
