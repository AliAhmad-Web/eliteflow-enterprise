/**
 * Efficient keyword / type search over memory entries.
 * Gated by AI_MEMORY_SEARCH. Never returns raw DB rows.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import type { AiMemoryType } from "../memory-types.js";
import { aiDataPolicyService } from "../../policy/ai-data-policy.service.js";
import type { AiMemoryIndex } from "./memory-index.js";

export interface MemorySearchQuery {
  readonly text?: string | null;
  readonly types?: readonly AiMemoryType[];
  readonly tags?: readonly string[];
  readonly maxResults?: number;
  readonly role?: string | null;
  readonly permissions?: readonly string[] | null;
  readonly explicitRestrictedAccess?: boolean;
  readonly userId?: string | null;
}

export interface MemorySearchResult {
  readonly entries: readonly AiMemoryEntry[];
  readonly matched: number;
  readonly querySummary: string;
}

function tokenize(text: string): readonly string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length >= 2)
    .slice(0, 24);
}

/**
 * Search indexed or provided entries by text/type/tag.
 */
export function searchMemoryEntries(
  entries: readonly AiMemoryEntry[],
  query: MemorySearchQuery,
  index?: AiMemoryIndex | null,
): MemorySearchResult {
  const maxResults = query.maxResults ?? 20;
  let candidates = entries;

  if (query.types && query.types.length > 0) {
    if (index) {
      const fromIndex: AiMemoryEntry[] = [];
      for (const type of query.types) {
        fromIndex.push(...index.listByType(type));
      }
      candidates = fromIndex;
    } else {
      const allowed = new Set(query.types);
      candidates = candidates.filter((e) => allowed.has(e.type));
    }
  }

  if (query.tags && query.tags.length > 0) {
    const wanted = query.tags.map((t) => t.toLowerCase());
    candidates = candidates.filter((e) =>
      e.tags.some((t) => wanted.includes(t.toLowerCase())),
    );
  }

  const tokens = tokenize(query.text?.trim() ?? "");
  let matched = candidates;
  if (tokens.length > 0) {
    matched = candidates.filter((entry) => {
      const hay = `${entry.summary} ${entry.tags.join(" ")} ${entry.source}`.toLowerCase();
      return tokens.some((t) => hay.includes(t));
    });
  }

  const ranked = [...matched].sort((a, b) => b.recency - a.recency);
  const sliced = ranked.slice(0, maxResults);

  const policySubject = aiDataPolicyService.subjectFrom({
    userId: query.userId,
    role: query.role,
    permissions: query.permissions,
    explicitRestrictedAccess: query.explicitRestrictedAccess === true,
  });
  const sanitized = aiDataPolicyService.sanitizeSearchResults(
    sliced,
    policySubject,
  );

  return Object.freeze({
    entries: Object.freeze(sanitized),
    matched: matched.length,
    querySummary: [
      tokens.length > 0 ? `text:${tokens.length}` : "text:none",
      `types:${query.types?.length ?? 0}`,
      `hits:${matched.length}`,
    ].join(";"),
  });
}
