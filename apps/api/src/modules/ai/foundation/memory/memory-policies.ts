/**
 * Enterprise AI Memory policies — retention, privacy, and window controls.
 * Metadata only; never writes to storage.
 */

import type { AiMemoryType } from "./memory-types.js";

export type AiMemoryRetentionPolicy =
  | "ephemeral"
  | "request-only"
  | "session-bound"
  | "strict";

export type AiMemoryPrivacyPolicy =
  | "strict"
  | "standard"
  | "permissive";

export interface AiMemoryPolicies {
  readonly retention: AiMemoryRetentionPolicy;
  readonly privacy: AiMemoryPrivacyPolicy;
  readonly maxEntries: number;
  readonly maxSummaryLength: number;
  readonly allowBusinessMemory: boolean;
  readonly allowPreferenceMemory: boolean;
  readonly allowUserMemory: boolean;
  readonly allowedTypes: readonly AiMemoryType[];
}

export function formatMemoryRetentionPolicy(
  policy: AiMemoryRetentionPolicy,
): string {
  switch (policy) {
    case "ephemeral":
      return "Ephemeral";
    case "request-only":
      return "Request Only";
    case "session-bound":
      return "Session Bound";
    case "strict":
      return "Strict";
    default: {
      const _exhaustive: never = policy;
      return _exhaustive;
    }
  }
}

export function formatMemoryPrivacyPolicy(
  policy: AiMemoryPrivacyPolicy,
): string {
  switch (policy) {
    case "strict":
      return "Strict";
    case "standard":
      return "Standard";
    case "permissive":
      return "Permissive";
    default: {
      const _exhaustive: never = policy;
      return _exhaustive;
    }
  }
}

const DEFAULT_ALLOWED_TYPES: readonly AiMemoryType[] = Object.freeze([
  "conversation",
  "user",
  "business",
  "session",
  "context",
  "preference",
  "working",
  "longterm",
]);

/**
 * Resolve runtime memory policies from privacy / history settings.
 */
export function resolveMemoryPolicies(input: {
  readonly privacyMode: boolean;
  readonly historyEnabled: boolean;
  readonly agentPrivacyBehavior?: "strict" | "standard" | "permissive" | null;
}): AiMemoryPolicies {
  if (input.privacyMode) {
    return Object.freeze({
      retention: "strict",
      privacy: "strict",
      maxEntries: 0,
      maxSummaryLength: 80,
      allowBusinessMemory: false,
      allowPreferenceMemory: false,
      allowUserMemory: false,
      allowedTypes: Object.freeze([] as AiMemoryType[]),
    });
  }

  const privacy: AiMemoryPrivacyPolicy =
    input.agentPrivacyBehavior ?? "standard";

  const maxEntries =
    privacy === "strict" ? 6 : privacy === "permissive" ? 16 : 10;

  return Object.freeze({
    retention: input.historyEnabled ? "request-only" : "ephemeral",
    privacy,
    maxEntries,
    maxSummaryLength: privacy === "strict" ? 100 : 160,
    allowBusinessMemory: privacy !== "strict",
    allowPreferenceMemory: true,
    allowUserMemory: privacy !== "strict",
    allowedTypes: DEFAULT_ALLOWED_TYPES,
  });
}
