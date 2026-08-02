import type { AiPipelineStage } from "./stage.js";
import {
  isAiMemorySessionContextEnabled,
  isAiWorkingMemoryEnabled,
} from "../../feature-flags.js";
import { resolveWorkingMemory } from "../../memory/working/working-memory-engine.js";

/**
 * Memory Working Stage.
 * Maintains active reasoning/session working memory after Orchestrator
 * and before Episodic / Retrieval. Complete no-op when AI_WORKING_MEMORY=false.
 */
export const memoryWorkingStage: AiPipelineStage = {
  name: "memory-working",
  async run(state) {
    if (!isAiWorkingMemoryEnabled()) {
      return {
        ...state,
        workingMemory: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        workingMemory: Object.freeze({
          entries: Object.freeze([]),
          context: Object.freeze({
            objective: null,
            focus: null,
            activeTask: null,
            mode: null,
            module: null,
          }),
          session: Object.freeze({
            sessionKey: "privacy",
            conversationId: null,
            userId: null,
            isolated: true,
          }),
          window: Object.freeze({
            size: 0,
            focus: null,
            objective: null,
            activeTask: null,
          }),
          capacity: Object.freeze({
            maxEntries: 0,
            maxTokensEstimate: 0,
            usedEntries: 0,
            evictedCount: 0,
          }),
          confidence: 0,
          notes: Object.freeze(["privacy-mode"]),
        }),
      };
    }

    const businessTask =
      state.businessAction?.summary ??
      state.businessDecision?.reasoningSummary ??
      state.businessExecution?.summary ??
      null;

    const workingMemory = resolveWorkingMemory({
      memoryEntries: state.memoryEntries,
      consolidatedEntries: state.memoryConsolidation?.consolidatedEntries,
      userPrompt: state.prompt,
      mode: state.mode ?? state.activeContext.mode,
      module: state.activeContext.module,
      userId: state.userId ?? state.activeContext.user?.userId ?? null,
      conversationId: state.activeContext.conversationId,
      businessTask,
      sessionContextEnabled: isAiMemorySessionContextEnabled(),
    });

    return {
      ...state,
      workingMemory,
    };
  },
};
