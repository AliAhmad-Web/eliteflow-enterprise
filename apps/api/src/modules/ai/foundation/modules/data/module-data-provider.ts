/**
 * Module Data Provider contract.
 * READ-ONLY — no create/update/delete/mutation/transaction APIs.
 */

import type { AiModuleDataContext } from "./module-data-context.js";
import type { AiModuleDataRequest } from "./module-data-request.js";
import type { AiModuleDataResponse } from "./module-data-response.js";

export type AiModuleDataHealth = "healthy" | "degraded" | "unavailable";

export interface AiModuleDataProviderMetadata {
  readonly moduleId: string;
  readonly name: string;
  /** Always true — write operations are forbidden. */
  readonly readOnly: true;
  readonly capabilities: readonly string[];
}

/**
 * Unified read adapter for one enterprise module.
 */
export interface AiModuleDataProvider {
  readonly moduleId: string;
  supportsQueries(queries: readonly string[]): boolean;
  fetch(
    request: AiModuleDataRequest,
    context: AiModuleDataContext,
  ): Promise<AiModuleDataResponse>;
  health(): Promise<AiModuleDataHealth>;
  capabilities(): readonly string[];
  metadata(): AiModuleDataProviderMetadata;
}
