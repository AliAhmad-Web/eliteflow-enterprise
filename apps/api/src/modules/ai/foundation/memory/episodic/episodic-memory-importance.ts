/**
 * Episodic memory importance scoring.
 */

import type { AiEpisodicEventKind } from "./episodic-memory-event.js";

const KIND_WEIGHT: Readonly<Record<AiEpisodicEventKind, number>> = {
  "task-completion": 0.95,
  "project-milestone": 0.9,
  "business-event": 0.85,
  "user-interaction": 0.7,
  "conversation-turn": 0.55,
  system: 0.4,
};

export function scoreEpisodicImportance(input: {
  readonly kind: AiEpisodicEventKind;
  readonly recency?: number;
  readonly semanticBoost?: number;
}): number {
  const base = KIND_WEIGHT[input.kind];
  const recency = input.recency ?? 0.5;
  const semantic = input.semanticBoost ?? 0;
  return Math.min(
    1,
    Math.round((base * 0.7 + recency * 0.25 + semantic * 0.05) * 1000) / 1000,
  );
}
