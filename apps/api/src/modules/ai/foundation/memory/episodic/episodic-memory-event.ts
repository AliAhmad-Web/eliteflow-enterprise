/**
 * Episodic memory event kinds.
 */

export type AiEpisodicEventKind =
  | "conversation-turn"
  | "business-event"
  | "project-milestone"
  | "task-completion"
  | "user-interaction"
  | "system";

export interface AiEpisodicMemoryEvent {
  readonly id: string;
  readonly kind: AiEpisodicEventKind;
  readonly summary: string;
  readonly occurredAt: string;
  readonly importance: number;
  readonly source: string;
}

export function formatEpisodicEventKind(kind: AiEpisodicEventKind): string {
  switch (kind) {
    case "conversation-turn":
      return "Conversation Turn";
    case "business-event":
      return "Business Event";
    case "project-milestone":
      return "Project Milestone";
    case "task-completion":
      return "Task Completion";
    case "user-interaction":
      return "User Interaction";
    case "system":
      return "System";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function freezeEpisodicMemoryEvent(
  event: AiEpisodicMemoryEvent,
): AiEpisodicMemoryEvent {
  return Object.freeze({ ...event });
}
