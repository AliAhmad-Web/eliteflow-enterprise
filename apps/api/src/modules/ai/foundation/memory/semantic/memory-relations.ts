/**
 * Memory relationship model.
 */

export type AiMemoryRelationKind =
  | "related-to"
  | "duplicate-of"
  | "parent-of"
  | "child-of"
  | "same-topic"
  | "same-conversation"
  | "same-user"
  | "same-module";

export interface AiMemoryRelation {
  readonly fromId: string;
  readonly toId: string;
  readonly kind: AiMemoryRelationKind;
  readonly strength: number;
  readonly label: string;
}

export function formatMemoryRelationKind(kind: AiMemoryRelationKind): string {
  switch (kind) {
    case "related-to":
      return "Related To";
    case "duplicate-of":
      return "Duplicate Of";
    case "parent-of":
      return "Parent Of";
    case "child-of":
      return "Child Of";
    case "same-topic":
      return "Same Topic";
    case "same-conversation":
      return "Same Conversation";
    case "same-user":
      return "Same User";
    case "same-module":
      return "Same Module";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function freezeMemoryRelation(
  relation: AiMemoryRelation,
): AiMemoryRelation {
  return Object.freeze({ ...relation });
}
