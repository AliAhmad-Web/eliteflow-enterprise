/**
 * Fetch aggregated read-only module data for selected modules.
 * Never writes. Never dumps raw rows.
 */

import type { AiSelectedModules } from "../module-resolver.js";
import type { AiModuleDataContext } from "./module-data-context.js";
import type {
  AiModuleDataBundle,
  AiModuleDataResponse,
} from "./module-data-response.js";
import { resolveModuleDataProvider } from "./resolve-module-data-provider.js";

export interface FetchModuleDataInput {
  readonly selectedModules?: AiSelectedModules | null;
  readonly context: AiModuleDataContext;
}

/**
 * Resolve providers for selected modules and fetch safe summaries.
 */
export async function fetchModuleData(
  input: FetchModuleDataInput,
): Promise<AiModuleDataBundle> {
  const modules = input.selectedModules?.modules ?? [];
  const responses: AiModuleDataResponse[] = [];

  for (const module of modules.slice(0, 8)) {
    const provider = resolveModuleDataProvider({ moduleId: module.id });
    if (!provider) continue;

    const response = await provider.fetch(
      {
        moduleId: module.id,
        query: "summary",
      },
      input.context,
    );
    responses.push(response);
  }

  return Object.freeze({
    responses: Object.freeze(responses),
    fetchedAt: new Date().toISOString(),
  });
}
