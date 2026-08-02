/**
 * Business Query intents — what the user wants to do.
 * Metadata only; never executes.
 */

export const AI_BUSINESS_QUERY_INTENTS = Object.freeze([
  "list",
  "summary",
  "search",
  "status",
  "progress",
  "analytics",
  "insights",
  "count",
  "open",
  "review",
  "compare",
  "recommendation",
  "details",
] as const);

export type AiBusinessQueryIntent =
  (typeof AI_BUSINESS_QUERY_INTENTS)[number];

export function isAiBusinessQueryIntent(
  value: string,
): value is AiBusinessQueryIntent {
  return (AI_BUSINESS_QUERY_INTENTS as readonly string[]).includes(value);
}

export function formatBusinessQueryIntent(
  intent: AiBusinessQueryIntent,
): string {
  switch (intent) {
    case "list":
      return "List";
    case "summary":
      return "Summary";
    case "search":
      return "Search";
    case "status":
      return "Status";
    case "progress":
      return "Progress";
    case "analytics":
      return "Analytics";
    case "insights":
      return "Insights";
    case "count":
      return "Count";
    case "open":
      return "Open";
    case "review":
      return "Review";
    case "compare":
      return "Compare";
    case "recommendation":
      return "Recommendation";
    case "details":
      return "Details";
    default: {
      const _exhaustive: never = intent;
      return _exhaustive;
    }
  }
}
