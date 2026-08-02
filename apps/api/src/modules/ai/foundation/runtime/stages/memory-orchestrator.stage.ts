import type { AiPipelineStage } from "./stage.js";
import {
  isAiEpisodicMemoryEnabled,
  isAiLongTermMemoryEnabled,
  isAiMemoryConsolidationEnabled,
  isAiMemoryContextEnabled,
  isAiMemoryFrameworkEnabled,
  isAiMemoryKnowledgeGraphEnabled,
  isAiMemoryLoadEnabled,
  isAiMemoryOrchestratorEnabled,
  isAiMemoryOptimizationEnabled,
  isAiMemoryRankingEnabled,
  isAiMemoryRetrievalEnabled,
  isAiMemorySaveEnabled,
  isAiPersistentMemoryEnabled,
  isAiSemanticMemoryEnabled,
  isAiWorkingMemoryEnabled,
} from "../../feature-flags.js";
import { buildMemoryOrchestration } from "../../memory/platform/memory-orchestrator.js";

/**
 * Memory Orchestrator Stage.
 * Plans unified memory lifecycle / subsystem coordination after Business Execution
 * and before the memory processing chain. Complete no-op when disabled.
 */
export const memoryOrchestratorStage: AiPipelineStage = {
  name: "memory-orchestrator",
  async run(state) {
    if (!isAiMemoryOrchestratorEnabled()) {
      return {
        ...state,
        memoryOrchestration: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        memoryOrchestration: buildMemoryOrchestration({
          loaded: false,
          working: false,
          episodic: false,
          retrieval: false,
          semantic: false,
          knowledge: false,
          longTerm: false,
          ranking: false,
          context: false,
          consolidation: false,
          persistentSave: false,
          optimization: false,
        }),
      };
    }

    const memoryOrchestration = buildMemoryOrchestration({
      loaded: isAiPersistentMemoryEnabled() && isAiMemoryLoadEnabled(),
      working: isAiWorkingMemoryEnabled(),
      episodic: isAiEpisodicMemoryEnabled(),
      retrieval: isAiMemoryFrameworkEnabled() && isAiMemoryRetrievalEnabled(),
      semantic: isAiSemanticMemoryEnabled(),
      knowledge: isAiSemanticMemoryEnabled() && isAiMemoryKnowledgeGraphEnabled(),
      longTerm: isAiLongTermMemoryEnabled(),
      ranking: isAiMemoryFrameworkEnabled() && isAiMemoryRankingEnabled(),
      context: isAiMemoryFrameworkEnabled() && isAiMemoryContextEnabled(),
      consolidation:
        isAiLongTermMemoryEnabled() && isAiMemoryConsolidationEnabled(),
      persistentSave: isAiPersistentMemoryEnabled() && isAiMemorySaveEnabled(),
      optimization: isAiMemoryOptimizationEnabled(),
    });

    return {
      ...state,
      memoryOrchestration,
    };
  },
};
