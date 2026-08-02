/**
 * Permission-aware memory access — metadata only.
 * Never bypasses authorization; never grants access.
 */

import type { AiMemoryEntry } from "./memory-entry.js";
import type { AiMemoryType } from "./memory-types.js";

export type AiMemoryAccessLevel = "none" | "read" | "restricted";

export interface AiMemoryPermissions {
  readonly accessLevel: AiMemoryAccessLevel;
  readonly allowedTypes: readonly AiMemoryType[];
  readonly deniedTypes: readonly AiMemoryType[];
  readonly requiredKeys: readonly string[];
  readonly reason: string;
}

export function formatMemoryAccessLevel(level: AiMemoryAccessLevel): string {
  switch (level) {
    case "none":
      return "None";
    case "read":
      return "Read";
    case "restricted":
      return "Restricted";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

/**
 * Resolve memory access boundaries from caller permission keys.
 */
export function resolveMemoryPermissions(input: {
  readonly permissions?: readonly string[] | null;
  readonly privacyMode: boolean;
}): AiMemoryPermissions {
  if (input.privacyMode) {
    return Object.freeze({
      accessLevel: "none",
      allowedTypes: Object.freeze([] as AiMemoryType[]),
      deniedTypes: Object.freeze([
        "conversation",
        "user",
        "business",
        "session",
        "context",
        "preference",
        "working",
        "longterm",
      ] as AiMemoryType[]),
      requiredKeys: Object.freeze([] as string[]),
      reason: "Memory access withheld in privacy mode.",
    });
  }

  const keys = new Set(
    (input.permissions ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean),
  );

  const hasAiUse = keys.size === 0 || keys.has("ai:use") || keys.has("*");

  if (!hasAiUse && keys.size > 0) {
    return Object.freeze({
      accessLevel: "restricted",
      allowedTypes: Object.freeze([
        "context",
        "working",
        "session",
      ] as AiMemoryType[]),
      deniedTypes: Object.freeze([
        "conversation",
        "user",
        "business",
        "preference",
        "longterm",
      ] as AiMemoryType[]),
      requiredKeys: Object.freeze(["ai:use"]),
      reason: "Limited memory types without ai:use permission.",
    });
  }

  return Object.freeze({
    accessLevel: "read",
      allowedTypes: Object.freeze([
        "conversation",
        "user",
        "business",
        "session",
        "context",
        "preference",
        "working",
        "longterm",
      ] as AiMemoryType[]),
    deniedTypes: Object.freeze([] as AiMemoryType[]),
    requiredKeys: Object.freeze(keys.size > 0 ? ["ai:use"] : []),
    reason: "Standard memory read access.",
  });
}

/**
 * Filter entries by permission boundaries.
 * Entries with empty permissionKeys are treated as publicly readable metadata.
 */
export function filterEntriesByPermissions(
  entries: readonly AiMemoryEntry[],
  permissions: AiMemoryPermissions,
  callerKeys?: readonly string[] | null,
): readonly AiMemoryEntry[] {
  if (permissions.accessLevel === "none") {
    return Object.freeze([]);
  }

  const denied = new Set(permissions.deniedTypes);
  const allowed = new Set(permissions.allowedTypes);
  const caller = new Set(
    (callerKeys ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean),
  );
  const unrestrictedCaller = caller.size === 0 || caller.has("*");

  return Object.freeze(
    entries.filter((entry) => {
      if (denied.has(entry.type)) return false;
      if (!allowed.has(entry.type)) return false;
      if (entry.permissionKeys.length === 0) return true;
      if (unrestrictedCaller) return true;
      return entry.permissionKeys.some((key) =>
        caller.has(key.trim().toLowerCase()),
      );
    }),
  );
}
