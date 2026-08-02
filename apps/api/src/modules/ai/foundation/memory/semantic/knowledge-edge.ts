/**
 * Knowledge graph edge types.
 */

export type AiKnowledgeEdgeKind =
  | "relates"
  | "parent-child"
  | "topic"
  | "conversation"
  | "user"
  | "module";

export interface AiKnowledgeEdge {
  readonly id: string;
  readonly fromId: string;
  readonly toId: string;
  readonly kind: AiKnowledgeEdgeKind;
  readonly weight: number;
  readonly label: string;
}

export function formatKnowledgeEdgeKind(kind: AiKnowledgeEdgeKind): string {
  switch (kind) {
    case "relates":
      return "Relates";
    case "parent-child":
      return "Parent-Child";
    case "topic":
      return "Topic";
    case "conversation":
      return "Conversation";
    case "user":
      return "User";
    case "module":
      return "Module";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function freezeKnowledgeEdge(edge: AiKnowledgeEdge): AiKnowledgeEdge {
  return Object.freeze({ ...edge });
}
