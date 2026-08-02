/**
 * Workflow metadata — public planning labels.
 */

import type { AiWorkflowKind } from "./workflow-definition.js";

export interface AiWorkflowMetadata {
  readonly tags: readonly string[];
  readonly supportsRetries: boolean;
  readonly supportsWaiting: boolean;
  readonly supportsParallel: boolean;
  readonly supportsApproval: boolean;
  readonly humanInTheLoop: boolean;
}

export function buildWorkflowMetadata(input: {
  readonly kind: AiWorkflowKind;
}): AiWorkflowMetadata {
  const kind = input.kind;
  return Object.freeze({
    tags: Object.freeze([
      "enterprise",
      "planning-only",
      kind,
      "no-execution",
    ]),
    supportsRetries: kind === "background" || kind === "sequential",
    supportsWaiting:
      kind === "approval" ||
      kind === "human-in-the-loop" ||
      kind === "conditional",
    supportsParallel: kind === "parallel",
    supportsApproval:
      kind === "approval" || kind === "human-in-the-loop",
    humanInTheLoop: kind === "human-in-the-loop",
  });
}
