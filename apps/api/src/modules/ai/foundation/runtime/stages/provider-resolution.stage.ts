import type { AiPipelineStage } from "./stage.js";
import { resolveProviderBinding } from "../../provider-resolution/resolve-provider-binding.js";

/**
 * Provider Resolution Stage.
 * Reads AiEffectivePolicy, validates against the Provider Registry, attaches binding.
 * Does not call generate / generateStream and does not modify provider classes.
 */
export const providerResolutionStage: AiPipelineStage = {
  name: "provider-resolution",
  async run(state) {
    const providerBinding = resolveProviderBinding(state.policy);
    return {
      ...state,
      providerBinding,
    };
  },
};
