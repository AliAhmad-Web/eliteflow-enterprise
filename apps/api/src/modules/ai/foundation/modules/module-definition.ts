/**
 * Enterprise Module Integration — module definition contract.
 * Metadata only — no database queries, no business logic.
 */

export type AiEnterpriseModuleAvailability =
  | "available"
  | "limited"
  | "unavailable";

/**
 * Registered enterprise module metadata (immutable once registered).
 */
export interface AiEnterpriseModuleDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly supportedActions: readonly string[];
  readonly supportedEntities: readonly string[];
  readonly supportedQueries: readonly string[];
  /** Public permission labels only — never private auth keys. */
  readonly permissions: readonly string[];
  /** Higher wins during soft matching. */
  readonly priority: number;
  readonly availability: AiEnterpriseModuleAvailability;
  /** Matching product module keys (case-insensitive). */
  readonly moduleKeys?: readonly string[] | null;
  /** Matching surfaces (case-insensitive). */
  readonly surfaces?: readonly string[] | null;
  /** Matching agent types that prefer this module. */
  readonly preferredAgentTypes?: readonly string[] | null;
  /** When false, resolver ignores this module. Default true. */
  readonly enabled?: boolean;
}

/**
 * Safe public module summary for pipeline / PE consumption.
 * Never carries database ids, tokens, or private permissions.
 */
export interface AiEnterpriseModuleSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly supportedActions: readonly string[];
  readonly supportedEntities: readonly string[];
  readonly priority: number;
  readonly availability: AiEnterpriseModuleAvailability;
}
