import type { AiPipelineStage } from "./stage.js";
import { isAiToolDiscoveryEnabled } from "../../feature-flags.js";
import { discoverTools } from "../../tools/tool-discovery.js";

/**
 * Tool Discovery Stage.
 * Filters disabled/unsupported registrations into immutable discovered tools.
 * Never executes tools. Skipped when AI_TOOL_DISCOVERY=false.
 */
export const toolDiscoveryStage: AiPipelineStage = {
  name: "tool-discovery",
  async run(state) {
    if (!isAiToolDiscoveryEnabled()) {
      return {
        ...state,
        discoveredTools: undefined,
      };
    }

    const registrations = state.toolRegistrations ?? [];
    const discoveredTools = discoverTools(registrations);

    return {
      ...state,
      discoveredTools,
    };
  },
};
