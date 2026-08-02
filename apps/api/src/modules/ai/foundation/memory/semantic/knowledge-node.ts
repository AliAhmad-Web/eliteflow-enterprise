/**
 * Knowledge graph node types.
 */

export type AiKnowledgeNodeKind =
  | "memory"
  | "entity"
  | "topic"
  | "conversation"
  | "user"
  | "module";

export interface AiKnowledgeNode {
  readonly id: string;
  readonly kind: AiKnowledgeNodeKind;
  readonly label: string;
  readonly memoryId?: string | null;
}

export function formatKnowledgeNodeKind(kind: AiKnowledgeNodeKind): string {
  switch (kind) {
    case "memory":
      return "Memory";
    case "entity":
      return "Entity";
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

export function freezeKnowledgeNode(node: AiKnowledgeNode): AiKnowledgeNode {
  return Object.freeze({ ...node });
}
