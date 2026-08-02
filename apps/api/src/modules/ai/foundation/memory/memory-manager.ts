/**
 * Enterprise AI Memory Manager — orchestrates registry, store, retrieve, rank, context.
 * Runtime-only. Never persists. Never executes tools. Never bypasses permissions.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";
import type { AiMemoryMessage } from "../contracts/ai-memory-message.js";
import type { AiAgentMemoryStrategy } from "../agents/ai-agent-memory-strategy.js";
import type { AiBusinessQuery } from "../business-query/business-query.js";
import type { AiBusinessDecision } from "../business-decision/business-decision.js";
import type { AiBusinessExecution } from "../business-execution/business-execution.js";
import type { AiMemory } from "./ai-memory.js";
import {
  countMemoryTypes,
  type AiMemoryContext,
} from "./memory-context.js";
import { compressMemoryEntries } from "./memory-compression.js";
import type { AiMemoryEntry } from "./memory-entry.js";
import { filterMemoryEntries } from "./memory-filter.js";
import {
  resolveMemoryPermissions,
  filterEntriesByPermissions,
  type AiMemoryPermissions,
} from "./memory-permissions.js";
import {
  resolveMemoryPolicies,
  type AiMemoryPolicies,
} from "./memory-policies.js";
import {
  rankMemoryEntries,
  type AiMemoryRanking,
} from "./memory-ranking.js";
import {
  enterpriseMemoryRegistry,
  type AiMemoryRegistry,
} from "./memory-registry.js";
import { retrieveMemoryEntries } from "./memory-retrieval.js";
import {
  createMemoryStore,
  type AiMemoryStore,
} from "./memory-store.js";
import {
  buildMemoryContextSummary,
  summarizeMemoryEntries,
} from "./memory-summarization.js";

export interface MemoryManagerResolveInput {
  readonly conversationHistory?: readonly AiMemoryMessage[];
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  readonly userPrompt?: string | null;
  readonly mode?: string | null;
  readonly agentMemoryStrategy?: AiAgentMemoryStrategy | null;
  readonly businessQuery?: AiBusinessQuery | null;
  readonly businessDecision?: AiBusinessDecision | null;
  readonly businessExecution?: AiBusinessExecution | null;
  readonly permissions?: readonly string[] | null;
  readonly registry?: AiMemoryRegistry;
}

/**
 * Memory Manager — request-scoped orchestration over runtime memory sources.
 */
export class AiMemoryManager {
  private readonly registry: AiMemoryRegistry;
  private store: AiMemoryStore;

  constructor(
    registry: AiMemoryRegistry = enterpriseMemoryRegistry,
    store?: AiMemoryStore,
  ) {
    this.registry = registry;
    this.store = store ?? createMemoryStore();
  }

  getStore(): AiMemoryStore {
    return this.store;
  }

  getRegistry(): AiMemoryRegistry {
    return this.registry;
  }

  resetStore(): void {
    this.store = createMemoryStore();
  }

  retrieve(input: MemoryManagerResolveInput): readonly AiMemoryEntry[] {
    const policies = resolveMemoryPolicies({
      privacyMode: input.policy.privacyMode,
      historyEnabled: input.policy.historyEnabled,
      agentPrivacyBehavior: input.agentMemoryStrategy?.privacyBehavior ?? null,
    });
    const permissions = resolveMemoryPermissions({
      permissions: input.permissions,
      privacyMode: input.policy.privacyMode,
    });

    const raw = retrieveMemoryEntries({
      conversationHistory: input.conversationHistory,
      activeContext: input.activeContext,
      policy: input.policy,
      userPrompt: input.userPrompt,
      mode: input.mode,
      agentMemoryStrategy: input.agentMemoryStrategy,
      businessQuery: input.businessQuery,
      businessDecision: input.businessDecision,
      businessExecution: input.businessExecution,
      registry: this.registry,
    });

    const permitted = filterEntriesByPermissions(
      raw,
      permissions,
      input.permissions,
    );
    const filtered = filterMemoryEntries(permitted, {}, policies);
    const compressed = compressMemoryEntries({
      entries: filtered,
      maxEntries: policies.maxEntries,
      maxSummaryLength: policies.maxSummaryLength,
    });

    this.store.clear();
    this.store.putMany(compressed);
    return this.store.list();
  }

  rank(
    entries: readonly AiMemoryEntry[],
    input: {
      readonly userPrompt?: string | null;
      readonly mode?: string | null;
      readonly maxItems?: number;
    } = {},
  ): AiMemoryRanking {
    return rankMemoryEntries({
      entries,
      userPrompt: input.userPrompt,
      mode: input.mode,
      maxItems: input.maxItems,
    });
  }

  buildContext(input: {
    readonly entries: readonly AiMemoryEntry[];
    readonly ranking?: AiMemoryRanking | null;
    readonly policy: AiEffectivePolicy;
    readonly agentPrivacyBehavior?: "strict" | "standard" | "permissive" | null;
    readonly permissions?: readonly string[] | null;
    readonly rankingConfidence?: number;
  }): AiMemoryContext {
    const policies: AiMemoryPolicies = resolveMemoryPolicies({
      privacyMode: input.policy.privacyMode,
      historyEnabled: input.policy.historyEnabled,
      agentPrivacyBehavior: input.agentPrivacyBehavior ?? null,
    });
    const memoryPermissions: AiMemoryPermissions = resolveMemoryPermissions({
      permissions: input.permissions,
      privacyMode: input.policy.privacyMode,
    });

    const sourceEntries =
      input.ranking?.rankedEntries ?? input.entries;
    const capped = sourceEntries.slice(0, Math.max(0, policies.maxEntries));
    const typeCounts = countMemoryTypes(capped);
    const topSummary = capped[0]?.summary ?? null;
    const summary = buildMemoryContextSummary({
      entryCount: capped.length,
      typeCounts,
      topSummary,
    });

    const confidence =
      input.rankingConfidence ??
      input.ranking?.confidence ??
      (capped.length > 0 ? 0.5 : 0);

    const notes: string[] = [
      `entries:${capped.length}`,
      `retention:${policies.retention}`,
      `privacy:${policies.privacy}`,
      `access:${memoryPermissions.accessLevel}`,
    ];
    if (input.ranking) {
      notes.push(`ranked:${input.ranking.items.length}`);
    }

    return Object.freeze({
      entries: Object.freeze([...capped]),
      summary,
      typeCounts,
      policies,
      permissions: memoryPermissions,
      confidence: Math.min(1, Math.round(confidence * 1000) / 1000),
      notes: Object.freeze(notes.slice(0, 12)),
    });
  }

  /**
   * Full retrieve → rank → context pipeline for a single request.
   */
  resolve(input: MemoryManagerResolveInput): AiMemory {
    const entries = this.retrieve(input);
    const ranking = this.rank(entries, {
      userPrompt: input.userPrompt,
      mode: input.mode,
      maxItems: 12,
    });
    const context = this.buildContext({
      entries,
      ranking,
      policy: input.policy,
      agentPrivacyBehavior: input.agentMemoryStrategy?.privacyBehavior ?? null,
      permissions: input.permissions,
    });

    return Object.freeze({
      entries,
      ranking,
      context,
      retrievedAt: new Date().toISOString(),
    });
  }

  /** Safe digest helper for diagnostics (not for prompts). */
  summarize(entries: readonly AiMemoryEntry[]): string {
    return summarizeMemoryEntries({ entries });
  }
}

export const enterpriseMemoryManager = new AiMemoryManager();

export function retrieveRuntimeMemoryEntries(
  input: MemoryManagerResolveInput,
): readonly AiMemoryEntry[] {
  return new AiMemoryManager(input.registry).retrieve(input);
}

export function rankRuntimeMemoryEntries(
  entries: readonly AiMemoryEntry[],
  input: {
    readonly userPrompt?: string | null;
    readonly mode?: string | null;
    readonly maxItems?: number;
  } = {},
): AiMemoryRanking {
  return enterpriseMemoryManager.rank(entries, input);
}

export function buildRuntimeMemoryContext(input: {
  readonly entries: readonly AiMemoryEntry[];
  readonly ranking?: AiMemoryRanking | null;
  readonly policy: AiEffectivePolicy;
  readonly agentPrivacyBehavior?: "strict" | "standard" | "permissive" | null;
  readonly permissions?: readonly string[] | null;
}): AiMemoryContext {
  return enterpriseMemoryManager.buildContext(input);
}
