import type { AiPipelineStage } from "./stage.js";
import {
  isAiMemoryFrameworkEnabled,
  isAiMemoryContextEnabled,
} from "../../feature-flags.js";
import { buildRuntimeMemoryContext } from "../../memory/memory-manager.js";
import { emptyTypeCounts } from "../../memory/memory-context.js";
import { resolveMemoryPolicies } from "../../memory/memory-policies.js";
import { resolveMemoryPermissions } from "../../memory/memory-permissions.js";

/**
 * Memory Context Stage.
 * Builds immutable memory context for Prompt Engineering after Ranking
 * and before Consolidation / Memory Platform. Appends SAFE summaries only.
 * Skipped when AI_MEMORY_FRAMEWORK or AI_MEMORY_CONTEXT is false (complete no-op).
 */
export const memoryContextStage: AiPipelineStage = {
  name: "memory-context",
  async run(state) {
    if (!isAiMemoryFrameworkEnabled() || !isAiMemoryContextEnabled()) {
      return {
        ...state,
        memoryContext: undefined,
      };
    }

    if (state.policy.privacyMode) {
      const policies = resolveMemoryPolicies({
        privacyMode: true,
        historyEnabled: state.policy.historyEnabled,
        agentPrivacyBehavior: "strict",
      });
      const permissions = resolveMemoryPermissions({
        permissions: state.contextHints?.permissions,
        privacyMode: true,
      });
      return {
        ...state,
        memoryContext: Object.freeze({
          entries: Object.freeze([]),
          summary: "Memory context withheld in privacy mode.",
          typeCounts: Object.freeze(emptyTypeCounts()),
          policies,
          permissions,
          confidence: 0,
          notes: Object.freeze(["privacy-mode"]),
        }),
      };
    }

    const memoryContext = buildRuntimeMemoryContext({
      entries: state.memoryEntries ?? [],
      ranking: state.memoryRanking,
      policy: state.policy,
      agentPrivacyBehavior: state.agentMemoryStrategy?.privacyBehavior ?? null,
      permissions: state.contextHints?.permissions,
    });

    return {
      ...state,
      memoryContext,
    };
  },
};
