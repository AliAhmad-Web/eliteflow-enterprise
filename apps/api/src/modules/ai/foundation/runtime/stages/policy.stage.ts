import type { AiPipelineStage } from "./stage.js";
import { resolveAiEffectivePolicy } from "../../settings/settings-enforcer.js";

/**
 * Stage 3 — Policy Stage (Settings Enforcer).
 * Resolves AiEffectivePolicy only. Does not alter prompts, memory, tools, or providers.
 */
export const policyStage: AiPipelineStage = {
  name: "policy",
  async run(state) {
    const policy = await resolveAiEffectivePolicy({
      userId: state.userId,
      overrides: state.policyOverrides,
    });

    return {
      ...state,
      policy,
    };
  },
};
