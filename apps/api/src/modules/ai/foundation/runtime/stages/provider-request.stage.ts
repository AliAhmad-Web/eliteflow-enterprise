import type { AiPipelineStage } from "./stage.js";
import { buildProviderRequest } from "../../provider-request/build-provider-request.js";

/**
 * Provider Request Builder Stage.
 * Centralizes construction of the immutable AiProviderRequest for Provider Stage.
 */
export const providerRequestStage: AiPipelineStage = {
  name: "provider-request",
  async run(state) {
    const providerRequest = buildProviderRequest(state);
    return {
      ...state,
      providerRequest,
    };
  },
};
