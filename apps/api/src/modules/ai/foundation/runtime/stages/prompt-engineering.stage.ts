import type { AiPipelineStage } from "./stage.js";
import { resolveBusinessContextSnippets } from "../../business-context/resolve-business-context-snippets.js";
import { isAiBusinessContextInjectionEnabled } from "../../feature-flags.js";
import { buildEngineeredPrompt } from "../../prompt-engineering/build-engineered-prompt.js";

/**
 * Prompt Engineering Stage.
 * Resolves permission-approved business summaries (optional), then builds engineered prompt.
 * Never rewrites the user message.
 */
export const promptEngineeringStage: AiPipelineStage = {
  name: "prompt-engineering",
  async run(state) {
    let businessSnippets = state.activeContext.snippets;

    if (
      isAiBusinessContextInjectionEnabled() &&
      !state.policy.privacyMode &&
      state.activeContext.entities.length > 0
    ) {
      businessSnippets = await resolveBusinessContextSnippets({
        userId: state.userId,
        role: state.activeContext.user?.role ?? state.contextHints?.role,
        permissions: state.contextHints?.permissions,
        activeContext: state.activeContext,
        policy: state.policy,
      });
    }

    const activeContext =
      businessSnippets.length > 0
        ? { ...state.activeContext, snippets: businessSnippets }
        : state.activeContext;

    const nextState = { ...state, activeContext };
    const engineeredPrompt = buildEngineeredPrompt(nextState, {
      businessSnippets,
    });

    return {
      ...nextState,
      engineeredPrompt,
    };
  },
};
