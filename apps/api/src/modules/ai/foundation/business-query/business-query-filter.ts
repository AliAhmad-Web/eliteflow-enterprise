/**
 * Business Query filters — safe structured constraints.
 * Never executes; never carries private payloads.
 */

export const AI_BUSINESS_QUERY_FILTERS = Object.freeze([
  "today",
  "this_week",
  "this_month",
  "assigned_to_me",
  "completed",
  "pending",
  "high_priority",
  "department",
  "organization",
  "date_range",
] as const);

export type AiBusinessQueryFilter =
  (typeof AI_BUSINESS_QUERY_FILTERS)[number];

export type AiBusinessQueryTimeRange =
  | "today"
  | "this_week"
  | "this_month"
  | "date_range"
  | "none";

export type AiBusinessQueryPriority = "high" | "normal" | "none";

export type AiBusinessQueryScope =
  | "current_user"
  | "organization"
  | "department"
  | "general";

export function isAiBusinessQueryFilter(
  value: string,
): value is AiBusinessQueryFilter {
  return (AI_BUSINESS_QUERY_FILTERS as readonly string[]).includes(value);
}

export function formatBusinessQueryFilter(
  filter: AiBusinessQueryFilter,
): string {
  switch (filter) {
    case "today":
      return "Today";
    case "this_week":
      return "This Week";
    case "this_month":
      return "This Month";
    case "assigned_to_me":
      return "Assigned To Me";
    case "completed":
      return "Completed";
    case "pending":
      return "Pending";
    case "high_priority":
      return "High Priority";
    case "department":
      return "Department";
    case "organization":
      return "Organization";
    case "date_range":
      return "Date Range";
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

export function formatBusinessQueryTimeRange(
  range: AiBusinessQueryTimeRange,
): string {
  switch (range) {
    case "today":
      return "Today";
    case "this_week":
      return "This Week";
    case "this_month":
      return "This Month";
    case "date_range":
      return "Date Range";
    case "none":
      return "None";
    default: {
      const _exhaustive: never = range;
      return _exhaustive;
    }
  }
}

export function timeRangeFromFilters(
  filters: readonly AiBusinessQueryFilter[],
): AiBusinessQueryTimeRange {
  if (filters.includes("today")) return "today";
  if (filters.includes("this_week")) return "this_week";
  if (filters.includes("this_month")) return "this_month";
  if (filters.includes("date_range")) return "date_range";
  return "none";
}

export function priorityFromFilters(
  filters: readonly AiBusinessQueryFilter[],
): AiBusinessQueryPriority {
  if (filters.includes("high_priority")) return "high";
  return "none";
}

export function scopeFromFilters(
  filters: readonly AiBusinessQueryFilter[],
): AiBusinessQueryScope {
  if (filters.includes("assigned_to_me")) return "current_user";
  if (filters.includes("department")) return "department";
  if (filters.includes("organization")) return "organization";
  return "general";
}
