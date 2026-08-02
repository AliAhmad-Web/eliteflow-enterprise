/**
 * Module Data Access — response contract.
 * Safe summaries only — never raw database rows or sensitive records.
 */

export type AiModuleDataStatus =
  | "ok"
  | "empty"
  | "denied"
  | "unavailable"
  | "error";

export interface AiModuleDataSummaryItem {
  readonly label: string;
  readonly value: string | number;
}

export interface AiModuleDataResponse {
  readonly moduleId: string;
  readonly moduleName: string;
  readonly status: AiModuleDataStatus;
  readonly summaries: readonly AiModuleDataSummaryItem[];
  readonly fetchedAt: string;
  readonly reason?: string;
}

/**
 * Aggregated immutable module data attached to pipeline state.
 */
export interface AiModuleDataBundle {
  readonly responses: readonly AiModuleDataResponse[];
  readonly fetchedAt: string;
}
