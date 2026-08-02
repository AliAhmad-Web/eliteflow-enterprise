/**
 * Memory integrity validation — duplicates, consistency, stale signals.
 */

import type { AiMemoryEntry } from "../memory-entry.js";

export interface AiMemoryIntegrityReport {
  readonly valid: boolean;
  readonly duplicateCount: number;
  readonly staleCount: number;
  readonly inconsistentCount: number;
  readonly checkedCount: number;
  readonly issues: readonly string[];
  readonly summary: string;
}

export function validateMemoryIntegrity(
  entries: readonly AiMemoryEntry[],
): AiMemoryIntegrityReport {
  const seen = new Map<string, number>();
  let duplicateCount = 0;
  let staleCount = 0;
  let inconsistentCount = 0;
  const issues: string[] = [];

  for (const entry of entries) {
    const key = `${entry.type}|${entry.summary.toLowerCase()}`;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 2) {
      duplicateCount += 1;
      issues.push("duplicate-summary");
    }
    if (entry.recency < 0.15 && entry.priority === "low") {
      staleCount += 1;
    }
    if (!entry.summary.trim() || entry.permissionKeys == null) {
      inconsistentCount += 1;
      issues.push("inconsistent-entry");
    }
  }

  const valid = duplicateCount === 0 && inconsistentCount === 0;
  return Object.freeze({
    valid,
    duplicateCount,
    staleCount,
    inconsistentCount,
    checkedCount: entries.length,
    issues: Object.freeze([...new Set(issues)].slice(0, 8)),
    summary: valid
      ? `Integrity ok (${entries.length} entries)`
      : `Integrity issues: dup=${duplicateCount}, stale=${staleCount}, bad=${inconsistentCount}`,
  });
}
