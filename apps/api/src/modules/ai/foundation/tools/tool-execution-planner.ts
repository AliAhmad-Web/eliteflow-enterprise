/**
 * Tool Execution Planner — builds an immutable wave-based execution plan.
 * Detects circular dependencies; never executes tools.
 */

import type {
  AiToolExecution,
  AiToolId,
} from "../contracts/ai-tool-execution.js";
import { getDeclaredDependencies } from "./tool-dependencies.js";

export interface AiToolPlanNode {
  readonly toolId: AiToolId;
  /** Dependencies that are present in this plan (filtered). */
  readonly dependsOn: readonly AiToolId[];
  readonly wave: number | null;
  readonly skipped: boolean;
  readonly skipReason?: string;
}

export interface AiToolExecutionPlan {
  /** All planned nodes in deterministic routed order. */
  readonly nodes: readonly AiToolPlanNode[];
  /** Parallelizable waves (toolIds). Sequential across waves. */
  readonly waves: readonly (readonly AiToolId[])[];
  readonly circularToolIds: readonly AiToolId[];
}

export interface BuildToolExecutionPlanInput {
  /** Routed / prepared executions (eligible + skipped passthrough). */
  readonly executions: readonly AiToolExecution[];
}

function detectCycles(
  toolIds: readonly AiToolId[],
  depsOf: ReadonlyMap<AiToolId, readonly AiToolId[]>,
): Set<AiToolId> {
  const circular = new Set<AiToolId>();
  const visiting = new Set<AiToolId>();
  const visited = new Set<AiToolId>();

  function dfs(toolId: AiToolId, stack: AiToolId[]): void {
    if (visited.has(toolId)) return;
    if (visiting.has(toolId)) {
      const start = stack.indexOf(toolId);
      const cycle =
        start >= 0 ? stack.slice(start).concat(toolId) : [toolId];
      for (const id of cycle) circular.add(id);
      return;
    }

    visiting.add(toolId);
    stack.push(toolId);
    for (const dep of depsOf.get(toolId) ?? []) {
      dfs(dep, stack);
    }
    stack.pop();
    visiting.delete(toolId);
    visited.add(toolId);
  }

  for (const toolId of toolIds) {
    dfs(toolId, []);
  }

  return circular;
}

/**
 * Build an immutable execution plan from routed tools.
 * - Filters declared deps to tools present in the selection
 * - Marks circular tools as skipped
 * - Assigns topological waves (stable by input order within a wave)
 */
export function buildToolExecutionPlan(
  input: BuildToolExecutionPlanInput,
): AiToolExecutionPlan {
  const eligible = input.executions.filter(
    (item) => item.status === "eligible",
  );
  const eligibleIds = eligible.map((item) => item.toolId);
  const eligibleSet = new Set(eligibleIds);
  const orderIndex = new Map(eligibleIds.map((id, i) => [id, i]));

  const depsOf = new Map<AiToolId, readonly AiToolId[]>();
  for (const toolId of eligibleIds) {
    const declared = getDeclaredDependencies(toolId);
    const filtered = declared.filter((dep) => eligibleSet.has(dep));
    depsOf.set(toolId, filtered);
  }

  const circular = detectCycles(eligibleIds, depsOf);
  const blocked = new Set<AiToolId>(circular);

  // Kahn topological layering among non-circular tools
  const remaining = new Set(
    eligibleIds.filter((id) => !blocked.has(id)),
  );
  const inDegree = new Map<AiToolId, number>();
  const dependents = new Map<AiToolId, AiToolId[]>();

  for (const toolId of remaining) {
    const deps = (depsOf.get(toolId) ?? []).filter((d) => remaining.has(d));
    inDegree.set(toolId, deps.length);
    for (const dep of deps) {
      const list = dependents.get(dep) ?? [];
      list.push(toolId);
      dependents.set(dep, list);
    }
  }

  const waves: AiToolId[][] = [];
  while (remaining.size > 0) {
    const wave = [...remaining]
      .filter((id) => (inDegree.get(id) ?? 0) === 0)
      .sort(
        (a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0),
      );

    if (wave.length === 0) {
      // Residual cycle / inconsistency — skip remaining
      for (const id of remaining) {
        blocked.add(id);
        circular.add(id);
      }
      break;
    }

    waves.push(wave);
    for (const id of wave) {
      remaining.delete(id);
      for (const child of dependents.get(id) ?? []) {
        inDegree.set(child, (inDegree.get(child) ?? 1) - 1);
      }
    }
  }

  const waveOf = new Map<AiToolId, number>();
  waves.forEach((wave, index) => {
    for (const id of wave) waveOf.set(id, index);
  });

  const nodes: AiToolPlanNode[] = eligible.map((execution) => {
    const toolId = execution.toolId;
    const dependsOn = depsOf.get(toolId) ?? [];
    if (blocked.has(toolId)) {
      return Object.freeze({
        toolId,
        dependsOn,
        wave: null,
        skipped: true,
        skipReason: circular.has(toolId)
          ? "circular_dependency"
          : "unsatisfiable_dependency_graph",
      });
    }

    return Object.freeze({
      toolId,
      dependsOn,
      wave: waveOf.get(toolId) ?? null,
      skipped: false,
    });
  });

  return Object.freeze({
    nodes: Object.freeze(nodes),
    waves: Object.freeze(waves.map((wave) => Object.freeze([...wave]))),
    circularToolIds: Object.freeze([...circular]),
  });
}
