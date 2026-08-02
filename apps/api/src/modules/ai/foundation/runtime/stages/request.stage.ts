import type { AiPipelineStage } from "./stage.js";

/**
 * Stage 1 — Request Stage (no-op).
 * Future: normalize inbound request into AiFoundationRequest.
 */
export const requestStage: AiPipelineStage = {
  name: "request",
  async run(state) {
    return state;
  },
};
