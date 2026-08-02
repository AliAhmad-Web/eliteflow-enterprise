/**
 * Long-term memory categories.
 */

export type AiLongTermMemoryCategory =
  | "preference"
  | "business"
  | "user"
  | "session"
  | "knowledge"
  | "operational"
  | "ephemeral";

export function formatLongTermMemoryCategory(
  category: AiLongTermMemoryCategory,
): string {
  switch (category) {
    case "preference":
      return "Preference";
    case "business":
      return "Business";
    case "user":
      return "User";
    case "session":
      return "Session";
    case "knowledge":
      return "Knowledge";
    case "operational":
      return "Operational";
    case "ephemeral":
      return "Ephemeral";
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

export function resolveLongTermMemoryCategory(input: {
  readonly type: string;
  readonly tags: readonly string[];
}): AiLongTermMemoryCategory {
  if (input.type === "preference" || input.tags.includes("preference")) {
    return "preference";
  }
  if (input.type === "business" || input.tags.includes("business")) {
    return "business";
  }
  if (input.type === "user") return "user";
  if (input.type === "session" || input.type === "context") return "session";
  if (input.type === "longterm" || input.type === "conversation") {
    return "knowledge";
  }
  if (input.type === "working") return "ephemeral";
  return "operational";
}
