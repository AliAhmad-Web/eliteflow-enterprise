import type { AiPipelineStage } from "./stage.js";
import { isAiModuleIntegrationEnabled } from "../../feature-flags.js";
import { resolveSelectedModules } from "../../modules/module-resolver.js";

/**
 * Module Resolution Stage.
 * Selects relevant enterprise modules from metadata after Business Query
 * and before Memory. Never queries databases or executes module logic.
 * Skipped when AI_MODULE_INTEGRATION=false (complete no-op).
 */
export const moduleResolutionStage: AiPipelineStage = {
  name: "module-resolution",
  async run(state) {
    if (!isAiModuleIntegrationEnabled()) {
      return {
        ...state,
        selectedModules: undefined,
      };
    }

    const selectedModules = resolveSelectedModules({
      activeContext: state.activeContext,
      activeAgent: state.activeAgent,
      agentDecision: state.agentDecision,
      businessQuery: state.businessQuery,
      mode: state.mode ?? state.activeContext.mode,
      prompt: state.prompt,
    });

    return {
      ...state,
      selectedModules,
    };
  },
};
