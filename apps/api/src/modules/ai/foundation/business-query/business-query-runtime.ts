/**
 * Format Business Query as safe Runtime Instructions metadata.
 * Never includes private data, emails, tokens, or record payloads.
 */

import type { AiBusinessQuery } from "./business-query.js";
import { formatBusinessQueryIntent } from "./business-query-intent.js";
import { formatBusinessQueryEntity } from "./business-query-entity.js";
import {
  formatBusinessQueryFilter,
  formatBusinessQueryTimeRange,
} from "./business-query-filter.js";

function sanitizeLine(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only business query metadata for the Runtime section.
 */
export function formatBusinessQueryForRuntime(
  query: AiBusinessQuery | null | undefined,
): string {
  if (!query) return "";

  const lines: string[] = [
    "Business Query:",
    `Business Intent: ${formatBusinessQueryIntent(query.intent)}`,
  ];

  if (query.moduleName) {
    lines.push(
      `Selected Module: ${sanitizeLine(query.moduleName, 40)}`,
    );
  }

  if (query.entity) {
    lines.push(`Entity: ${formatBusinessQueryEntity(query.entity)}`);
  }

  if (query.filters.length > 0) {
    lines.push(
      `Filters: ${query.filters
        .map((f) => formatBusinessQueryFilter(f))
        .join(", ")}`,
    );
  }

  if (query.timeRange !== "none") {
    lines.push(
      `Time Range: ${formatBusinessQueryTimeRange(query.timeRange)}`,
    );
  }

  return lines.join("\n").trim();
}
