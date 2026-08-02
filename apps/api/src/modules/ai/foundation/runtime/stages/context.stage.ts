import type { AiPipelineStage } from "./stage.js";
import { resolveAiActiveContext } from "../../context/resolve-active-context.js";

/**
 * Context Stage — Enterprise Context Engine (metadata only).
 * Permission-filters entity refs; does not query CRM/Projects/Tasks or alter prompts.
 */
export const contextStage: AiPipelineStage = {
  name: "context",
  async run(state) {
    const activeContext = await resolveAiActiveContext({
      userId: state.userId,
      hints: state.contextHints,
    });

    return {
      ...state,
      activeContext,
    };
  },
};
