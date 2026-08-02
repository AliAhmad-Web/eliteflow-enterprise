import type { AiPipelineStage } from "./stage.js";
import { isAiToolDiscoveryEnabled } from "../../feature-flags.js";
import { enterpriseToolRegistry } from "../../tools/tool-registry.js";

/**
 * Tool Registry Stage.
 * Attaches an immutable snapshot of registered tools for Discovery.
 * Skipped when AI_TOOL_DISCOVERY=false (eligibility uses static catalog).
 */
export const toolRegistryStage: AiPipelineStage = {
  name: "tool-registry",
  async run(state) {
    if (!isAiToolDiscoveryEnabled()) {
      return {
        ...state,
        toolRegistrations: undefined,
        discoveredTools: undefined,
      };
    }

    return {
      ...state,
      toolRegistrations: enterpriseToolRegistry.list(),
    };
  },
};
