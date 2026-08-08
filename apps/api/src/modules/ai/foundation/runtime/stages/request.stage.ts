import { promptSecurityService } from "../../security/index.js";
import type { AiPipelineStage } from "./stage.js";

/**
 * Stage 1 — Request Stage.
 * Prompt security scan on inbound user prompt (injection / exfiltration).
 * Does not rewrite the user prompt; blocks high-severity attacks.
 */
export const requestStage: AiPipelineStage = {
  name: "request",
  async run(state) {
    if (!promptSecurityService.isEnabled()) {
      return state;
    }

    const prompt = state.prompt ?? "";
    promptSecurityService.assertSafePrompt(prompt, {
      userId: state.userId ?? state.activeContext?.user?.userId ?? null,
      conversationId: state.contextHints?.conversationId ?? null,
      surface: "request",
    });

    return state;
  },
};
