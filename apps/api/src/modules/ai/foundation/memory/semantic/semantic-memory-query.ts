/**
 * Semantic memory query contract.
 */

export interface AiSemanticMemoryQuery {
  readonly text: string;
  readonly topK: number;
  readonly threshold: number;
  readonly mode?: string | null;
  readonly moduleHint?: string | null;
}

export function buildSemanticMemoryQuery(input: {
  readonly text?: string | null;
  readonly mode?: string | null;
  readonly moduleHint?: string | null;
  readonly topK?: number;
  readonly threshold?: number;
}): AiSemanticMemoryQuery {
  return Object.freeze({
    text: (input.text ?? "").trim(),
    topK: Math.max(1, Math.min(20, input.topK ?? 5)),
    threshold: Math.max(0, Math.min(1, input.threshold ?? 0.35)),
    mode: input.mode ?? null,
    moduleHint: input.moduleHint ?? null,
  });
}
