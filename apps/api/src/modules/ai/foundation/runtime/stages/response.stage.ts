import type { AiPipelineStage } from "./stage.js";
import { validateFoundationResponse } from "../../response/validate-foundation-response.js";

/**
 * Response Validation Stage.
 * Normalizes provider result metadata into AiFoundationResponse.
 * Does not modify response content or the public result DTO.
 */
export const responseStage: AiPipelineStage = {
  name: "response-validation",
  async run(state) {
    if (state.result === undefined) {
      throw new Error(
        "AI response validation failed: pipeline result is missing",
      );
    }

    const foundationResponse = validateFoundationResponse({
      result: state.result,
      providerRequest: state.providerRequest,
      providerBinding: state.providerBinding,
    });

    return {
      ...state,
      foundationResponse,
    };
  },
};
