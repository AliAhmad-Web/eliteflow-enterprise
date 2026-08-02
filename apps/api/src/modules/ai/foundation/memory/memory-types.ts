/**
 * Enterprise AI Memory type taxonomy.
 */

export type AiMemoryType =
  | "conversation"
  | "user"
  | "business"
  | "session"
  | "context"
  | "preference"
  | "working"
  | "longterm";

export const AI_MEMORY_TYPES: readonly AiMemoryType[] = Object.freeze([
  "conversation",
  "user",
  "business",
  "session",
  "context",
  "preference",
  "working",
  "longterm",
]);

export function formatMemoryType(type: AiMemoryType): string {
  switch (type) {
    case "conversation":
      return "Conversation";
    case "user":
      return "User";
    case "business":
      return "Business";
    case "session":
      return "Session";
    case "context":
      return "Context";
    case "preference":
      return "Preference";
    case "working":
      return "Working";
    case "longterm":
      return "Long-term";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function isAiMemoryType(value: string): value is AiMemoryType {
  return (AI_MEMORY_TYPES as readonly string[]).includes(value);
}
