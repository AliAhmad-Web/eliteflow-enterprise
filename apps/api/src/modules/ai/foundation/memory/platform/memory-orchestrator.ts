/**
 * Memory orchestrator — coordinates subsystem enablement without duplicating engines.
 */

import type { AiMemoryLifecyclePlan } from "./memory-lifecycle.js";
import { buildMemoryLifecyclePlan } from "./memory-lifecycle.js";

export interface AiMemorySubsystemStatus {
  readonly id: string;
  readonly enabled: boolean;
  readonly role: string;
}

export interface AiMemoryOrchestration {
  readonly lifecycle: AiMemoryLifecyclePlan;
  readonly subsystems: readonly AiMemorySubsystemStatus[];
  readonly adaptiveRetrieval: boolean;
  readonly consolidationScheduled: boolean;
  readonly summary: string;
  readonly notes: readonly string[];
}

export interface BuildMemoryOrchestrationInput {
  readonly loaded: boolean;
  readonly working: boolean;
  readonly episodic: boolean;
  readonly retrieval: boolean;
  readonly semantic: boolean;
  readonly knowledge: boolean;
  readonly longTerm: boolean;
  readonly ranking: boolean;
  readonly context: boolean;
  readonly consolidation: boolean;
  readonly persistentSave: boolean;
  readonly optimization: boolean;
}

export function buildMemoryOrchestration(
  input: BuildMemoryOrchestrationInput,
): AiMemoryOrchestration {
  const subsystems: AiMemorySubsystemStatus[] = [
    { id: "load", enabled: input.loaded, role: "persistent-load" },
    { id: "working", enabled: input.working, role: "session-working" },
    { id: "episodic", enabled: input.episodic, role: "episode-timeline" },
    { id: "retrieval", enabled: input.retrieval, role: "runtime-retrieval" },
    { id: "semantic", enabled: input.semantic, role: "similarity" },
    { id: "knowledge", enabled: input.knowledge, role: "knowledge-graph" },
    { id: "long-term", enabled: input.longTerm, role: "long-term-intelligence" },
    { id: "ranking", enabled: input.ranking, role: "ranking" },
    { id: "context", enabled: input.context, role: "context-builder" },
    { id: "consolidation", enabled: input.consolidation, role: "consolidation" },
    { id: "save", enabled: input.persistentSave, role: "persistent-save" },
  ].map((s) => Object.freeze(s));

  const enabledCount = subsystems.filter((s) => s.enabled).length;
  const adaptiveRetrieval = input.optimization && input.retrieval;
  const consolidationScheduled = input.consolidation;

  return Object.freeze({
    lifecycle: buildMemoryLifecyclePlan("load"),
    subsystems: Object.freeze(subsystems),
    adaptiveRetrieval,
    consolidationScheduled,
    summary: `Orchestrating ${enabledCount}/${subsystems.length} memory subsystems`,
    notes: Object.freeze([
      `enabled:${enabledCount}`,
      adaptiveRetrieval ? "adaptive-retrieval:on" : "adaptive-retrieval:off",
      consolidationScheduled ? "consolidation:scheduled" : "consolidation:idle",
    ]),
  });
}

export const memoryOrchestrator = Object.freeze({
  build: buildMemoryOrchestration,
});
