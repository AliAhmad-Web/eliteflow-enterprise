/**
 * Enterprise AI Memory scope levels.
 * Controls visibility boundary within a single request runtime.
 */

export type AiMemoryScope =
  | "request"
  | "session"
  | "conversation"
  | "user"
  | "organization"
  | "global";

export const AI_MEMORY_SCOPES: readonly AiMemoryScope[] = Object.freeze([
  "request",
  "session",
  "conversation",
  "user",
  "organization",
  "global",
]);

export function formatMemoryScope(scope: AiMemoryScope): string {
  switch (scope) {
    case "request":
      return "Request";
    case "session":
      return "Session";
    case "conversation":
      return "Conversation";
    case "user":
      return "User";
    case "organization":
      return "Organization";
    case "global":
      return "Global";
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
}

export function isAiMemoryScope(value: string): value is AiMemoryScope {
  return (AI_MEMORY_SCOPES as readonly string[]).includes(value);
}
