/**
 * Enterprise AI Memory filtering helpers.
 */

import type { AiMemoryEntry } from "./memory-entry.js";
import type { AiMemoryPolicies } from "./memory-policies.js";
import type { AiMemoryPriority } from "./memory-priority.js";
import type { AiMemoryScope } from "./memory-scope.js";
import type { AiMemoryType } from "./memory-types.js";

export interface AiMemoryFilterCriteria {
  readonly types?: readonly AiMemoryType[];
  readonly scopes?: readonly AiMemoryScope[];
  readonly minPriority?: AiMemoryPriority;
  readonly tags?: readonly string[];
  readonly maxEntries?: number;
}

const PRIORITY_RANK: Readonly<Record<AiMemoryPriority, number>> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * Apply type/scope/priority/tag filters and policy caps.
 */
export function filterMemoryEntries(
  entries: readonly AiMemoryEntry[],
  criteria: AiMemoryFilterCriteria = {},
  policies?: AiMemoryPolicies | null,
): readonly AiMemoryEntry[] {
  const allowedTypes = new Set(
    criteria.types ?? policies?.allowedTypes ?? [],
  );
  const typeFilterActive =
    (criteria.types?.length ?? 0) > 0 ||
    (policies?.allowedTypes.length ?? 0) > 0;

  const scopes = criteria.scopes ? new Set(criteria.scopes) : null;
  const tags = criteria.tags?.map((t) => t.toLowerCase()) ?? null;
  const minRank = criteria.minPriority
    ? PRIORITY_RANK[criteria.minPriority]
    : 0;

  let filtered = entries.filter((entry) => {
    if (typeFilterActive && allowedTypes.size > 0 && !allowedTypes.has(entry.type)) {
      return false;
    }
    if (policies) {
      if (!policies.allowBusinessMemory && entry.type === "business") {
        return false;
      }
      if (!policies.allowPreferenceMemory && entry.type === "preference") {
        return false;
      }
      if (!policies.allowUserMemory && entry.type === "user") {
        return false;
      }
    }
    if (scopes && !scopes.has(entry.scope)) {
      return false;
    }
    if (PRIORITY_RANK[entry.priority] < minRank) {
      return false;
    }
    if (tags && tags.length > 0) {
      const entryTags = entry.tags.map((t) => t.toLowerCase());
      if (!tags.some((t) => entryTags.includes(t))) {
        return false;
      }
    }
    return true;
  });

  const cap = criteria.maxEntries ?? policies?.maxEntries ?? filtered.length;
  if (cap >= 0 && filtered.length > cap) {
    filtered = filtered.slice(0, cap);
  }

  return Object.freeze([...filtered]);
}
