import type { AiPipelineStage } from "./stage.js";

/**
 * Provider Stage — requires AiProviderRequest from the builder, then delegates
 * to existing AiService execute (which consumes the request for generate params).
 */
export const providerStage: AiPipelineStage = {
  name: "provider",
  async run(state) {
    if (!state.providerRequest) {
      throw new Error(
        "AI runtime pipeline missing providerRequest — Provider Request Builder must run first",
      );
    }

    const result = await state.execute(state);
    return {
      ...state,
      result,
    };
  },
};
