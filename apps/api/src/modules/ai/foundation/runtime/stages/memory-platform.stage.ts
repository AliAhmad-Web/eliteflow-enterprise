import type { AiPipelineStage } from "./stage.js";
import {
  isAiMemoryAnalyticsEnabled,
  isAiMemoryDiagnosticsEnabled,
  isAiMemoryHealthEnabled,
  isAiMemoryMonitoringEnabled,
  isAiMemoryOptimizationEnabled,
  isAiMemoryOrchestratorEnabled,
} from "../../feature-flags.js";
import { resolveMemoryPlatform } from "../../memory/platform/memory-platform-engine.js";
import { buildMemoryOrchestration } from "../../memory/platform/memory-orchestrator.js";
import { validateMemoryIntegrity } from "../../memory/platform/memory-integrity.js";

/**
 * Memory Platform Stage.
 * Finalizes optimization, health, analytics, monitoring, and diagnostics
 * after Consolidation and before Prompt Engineering path.
 * Requires AI_MEMORY_ORCHESTRATOR; subsystem flags gate optional facets.
 */
export const memoryPlatformStage: AiPipelineStage = {
  name: "memory-platform",
  async run(state) {
    if (!isAiMemoryOrchestratorEnabled()) {
      return {
        ...state,
        memoryPlatform: undefined,
      };
    }

    if (state.policy.privacyMode) {
      const orchestration =
        state.memoryOrchestration ??
        buildMemoryOrchestration({
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
        });
      const integrity = validateMemoryIntegrity([]);
      return {
        ...state,
        memoryPlatform: Object.freeze({
          orchestration,
          integrity,
          confidence: 0,
          summary: "Memory platform withheld in privacy mode.",
          notes: Object.freeze(["privacy-mode"]),
        }),
      };
    }

    const entries = [
      ...(state.memoryConsolidation?.consolidatedEntries ?? []),
      ...(state.memoryRanking?.rankedEntries ?? []),
      ...(state.memoryEntries ?? []),
      ...(state.relatedMemories ?? []),
    ];

    // Deduplicate by id for platform metrics.
    const byId = new Map(entries.map((e) => [e.id, e]));
    const uniqueEntries = Object.freeze([...byId.values()]);

    const orchestration =
      state.memoryOrchestration ??
      buildMemoryOrchestration({
        loaded: Boolean(state.loadedMemory),
        working: Boolean(state.workingMemory),
        episodic: Boolean(state.episodicMemory),
        retrieval: Boolean(state.memoryEntries),
        semantic: Boolean(state.semanticMemory),
        knowledge: Boolean(state.knowledgeMemory),
        longTerm: Boolean(state.longTermMemory),
        ranking: Boolean(state.memoryRanking),
        context: Boolean(state.memoryContext),
        consolidation: Boolean(state.memoryConsolidation),
        persistentSave: Boolean(state.savedMemory),
        optimization: isAiMemoryOptimizationEnabled(),
      });

    const confidences = [
      state.memoryContext?.confidence,
      state.semanticMemory?.result.confidence,
      state.knowledgeMemory?.summary.confidence,
      state.longTermMemory?.confidence,
      state.workingMemory?.confidence,
      state.episodicMemory?.confidence,
      state.memoryConsolidation?.confidence,
      state.memoryRanking?.confidence,
    ].filter((n): n is number => typeof n === "number");

    const memoryPlatform = await resolveMemoryPlatform({
      entries: uniqueEntries,
      loadedCount: state.loadedMemory?.entryCount ?? 0,
      workingCount: state.workingMemory?.entries.length ?? 0,
      episodicCount: state.episodicMemory?.entries.length ?? 0,
      semanticHitCount:
        state.semanticMemory?.result.similarityHits.length ?? 0,
      longTermActiveCount: state.longTermMemory?.activeEntries.length ?? 0,
      consolidatedCount:
        state.memoryConsolidation?.consolidatedEntries.length ?? 0,
      confidences,
      fromCache: state.loadedMemory?.fromCache === true,
      consolidationPresent: Boolean(state.memoryConsolidation),
      orchestration,
      optimizationEnabled: isAiMemoryOptimizationEnabled(),
      analyticsEnabled: isAiMemoryAnalyticsEnabled(),
      monitoringEnabled: isAiMemoryMonitoringEnabled(),
      healthEnabled: isAiMemoryHealthEnabled(),
      diagnosticsEnabled: isAiMemoryDiagnosticsEnabled(),
    });

    return {
      ...state,
      memoryPlatform,
    };
  },
};
