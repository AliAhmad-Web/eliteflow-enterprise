import type { AiPipelineStage } from "./stage.js";
import { isAiModuleDataAccessEnabled } from "../../feature-flags.js";
import { fetchModuleData } from "../../modules/data/fetch-module-data.js";

/**
 * Module Data Stage.
 * Fetches read-only safe summaries from selected enterprise modules
 * after Module Resolution and before Memory.
 * Never writes. Never dumps raw rows.
 * Skipped when AI_MODULE_DATA_ACCESS=false (complete no-op).
 */
export const moduleDataStage: AiPipelineStage = {
  name: "module-data",
  async run(state) {
    if (!isAiModuleDataAccessEnabled()) {
      return {
        ...state,
        moduleData: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        moduleData: Object.freeze({
          responses: Object.freeze([]),
          fetchedAt: new Date().toISOString(),
        }),
      };
    }

    try {
      const moduleData = await fetchModuleData({
        selectedModules: state.selectedModules,
        context: {
          userId: state.userId ?? state.activeContext.user?.userId ?? null,
          role: state.activeContext.user?.role ?? null,
          email: state.activeContext.user?.email ?? null,
          permissions: state.contextHints?.permissions,
          activeContext: state.activeContext,
          policy: state.policy,
        },
      });

      return {
        ...state,
        moduleData,
      };
    } catch {
      // Data access failures must never interrupt the AI pipeline.
      return {
        ...state,
        moduleData: Object.freeze({
          responses: Object.freeze([]),
          fetchedAt: new Date().toISOString(),
        }),
      };
    }
  },
};
