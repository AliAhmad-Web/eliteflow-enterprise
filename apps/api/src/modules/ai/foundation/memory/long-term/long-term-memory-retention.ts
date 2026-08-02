/**
 * Retention policies for long-term memory.
 */

import type { AiLongTermMemoryCategory } from "./long-term-memory-category.js";

export type AiMemoryRetentionPolicyKind =
  | "permanent"
  | "long"
  | "standard"
  | "short"
  | "ephemeral";

export interface AiMemoryRetentionPolicy {
  readonly kind: AiMemoryRetentionPolicyKind;
  readonly maxAgeDays: number | null;
  readonly preserve: boolean;
}

export function formatMemoryRetentionPolicyKind(
  kind: AiMemoryRetentionPolicyKind,
): string {
  switch (kind) {
    case "permanent":
      return "Permanent";
    case "long":
      return "Long";
    case "standard":
      return "Standard";
    case "short":
      return "Short";
    case "ephemeral":
      return "Ephemeral";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function resolveMemoryRetentionPolicy(input: {
  readonly category: AiLongTermMemoryCategory;
  readonly importance: number;
  readonly retentionEnabled: boolean;
}): AiMemoryRetentionPolicy {
  if (!input.retentionEnabled) {
    return Object.freeze({
      kind: "standard",
      maxAgeDays: null,
      preserve: false,
    });
  }

  if (input.category === "preference") {
    return Object.freeze({
      kind: "permanent",
      maxAgeDays: null,
      preserve: true,
    });
  }
  if (input.category === "business" || input.importance >= 0.8) {
    return Object.freeze({
      kind: "long",
      maxAgeDays: 180,
      preserve: true,
    });
  }
  if (input.category === "knowledge" || input.category === "user") {
    return Object.freeze({
      kind: "standard",
      maxAgeDays: 90,
      preserve: input.importance >= 0.55,
    });
  }
  if (input.category === "session" || input.category === "operational") {
    return Object.freeze({
      kind: "short",
      maxAgeDays: 14,
      preserve: false,
    });
  }
  return Object.freeze({
    kind: "ephemeral",
    maxAgeDays: 1,
    preserve: false,
  });
}
