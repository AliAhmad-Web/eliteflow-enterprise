import type { AiPipelineStage } from "./stage.js";
import {
  isAiMemoryFrameworkEnabled,
  isAiMemoryRetrievalEnabled,
} from "../../feature-flags.js";
import { compressMemoryEntries } from "../../memory/memory-compression.js";
import { filterMemoryEntries } from "../../memory/memory-filter.js";
import {
  filterEntriesByPermissions,
  resolveMemoryPermissions,
} from "../../memory/memory-permissions.js";
import { resolveMemoryPolicies } from "../../memory/memory-policies.js";
import { retrieveMemoryEntries } from "../../memory/memory-retrieval.js";
import type { AiMemoryEntry } from "../../memory/memory-entry.js";

/**
 * Memory Retrieval Stage.
 * Merges runtime signals with optionally loaded persistent memory.
 * Never writes to the database (persistence is Memory Save Stage only).
 * Skipped when AI_MEMORY_FRAMEWORK or AI_MEMORY_RETRIEVAL is false (complete no-op).
 */
export const memoryRetrievalStage: AiPipelineStage = {
  name: "memory-retrieval",
  async run(state) {
    if (!isAiMemoryFrameworkEnabled() || !isAiMemoryRetrievalEnabled()) {
      return {
        ...state,
        memoryEntries: undefined,
      };
    }

    if (state.policy.privacyMode) {
      return {
        ...state,
        memoryEntries: Object.freeze([]),
      };
    }

    const policies = resolveMemoryPolicies({
      privacyMode: state.policy.privacyMode,
      historyEnabled: state.policy.historyEnabled,
      agentPrivacyBehavior: state.agentMemoryStrategy?.privacyBehavior ?? null,
    });
    const permissions = resolveMemoryPermissions({
      permissions: state.contextHints?.permissions,
      privacyMode: state.policy.privacyMode,
    });

    const runtimeEntries = retrieveMemoryEntries({
      conversationHistory: state.conversationHistory,
      activeContext: state.activeContext,
      policy: state.policy,
      userPrompt: state.prompt,
      mode: state.mode,
      agentMemoryStrategy: state.agentMemoryStrategy,
      businessQuery: state.businessQuery,
      businessDecision: state.businessDecision,
      businessExecution: state.businessExecution,
    });

    const loaded = state.loadedMemory?.entries ?? [];
    const merged: AiMemoryEntry[] = [...loaded, ...runtimeEntries];

    // Deduplicate by id while preserving order (loaded first).
    const seen = new Set<string>();
    const deduped: AiMemoryEntry[] = [];
    for (const entry of merged) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      deduped.push(entry);
    }

    const permitted = filterEntriesByPermissions(
      deduped,
      permissions,
      state.contextHints?.permissions,
    );
    const filtered = filterMemoryEntries(permitted, {}, policies);
    const memoryEntries = compressMemoryEntries({
      entries: filtered,
      maxEntries: policies.maxEntries,
      maxSummaryLength: policies.maxSummaryLength,
    });

    return {
      ...state,
      memoryEntries,
    };
  },
};
