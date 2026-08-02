/**
 * Module Data Access — request contract.
 * Read-only query intent. Never carries write payloads.
 */

export type AiModuleDataQueryKind =
  | "summary"
  | "count"
  | "list-lite"
  | "health";

export interface AiModuleDataRequest {
  readonly moduleId: string;
  readonly query: AiModuleDataQueryKind;
  /** Optional public query hint (never SQL). */
  readonly intent?: string | null;
  readonly limit?: number;
}
