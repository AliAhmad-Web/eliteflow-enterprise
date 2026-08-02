/**
 * Enterprise AI Action Framework — action definition contract.
 * Metadata only — never executes business actions or calls services.
 */

export type AiActionCategory =
  | "task"
  | "project"
  | "crm"
  | "calendar"
  | "document"
  | "report"
  | "email"
  | "workflow"
  | "notification"
  | "storage"
  | "settings"
  | "generic";

/**
 * Registered action definition (immutable once registered).
 */
export interface AiActionDefinition {
  readonly id: string;
  readonly category: AiActionCategory;
  readonly name: string;
  readonly description: string;
  /** Public capability labels only — never private auth keys. */
  readonly capabilities: readonly string[];
  readonly supportedEntities: readonly string[];
  readonly supportedIntents: readonly string[];
  /** Matching product module keys (case-insensitive). */
  readonly moduleKeys?: readonly string[] | null;
  /** Matching agent types that prefer this action. */
  readonly preferredAgentTypes?: readonly string[] | null;
  /** Matching surfaces (case-insensitive). */
  readonly surfaces?: readonly string[] | null;
  /** Higher wins during soft matching. */
  readonly priority: number;
  /** When false, resolver ignores this action. Default true. */
  readonly enabled?: boolean;
}
