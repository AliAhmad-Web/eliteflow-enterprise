/**
 * Unified memory lifecycle phases for the Enterprise Memory Platform.
 */

export type AiMemoryLifecyclePhase =
  | "load"
  | "working"
  | "episodic"
  | "retrieval"
  | "semantic"
  | "knowledge"
  | "long-term"
  | "ranking"
  | "context"
  | "consolidation"
  | "prompt"
  | "save"
  | "idle";

export const AI_MEMORY_LIFECYCLE_ORDER: readonly AiMemoryLifecyclePhase[] =
  Object.freeze([
    "load",
    "working",
    "episodic",
    "retrieval",
    "semantic",
    "knowledge",
    "long-term",
    "ranking",
    "context",
    "consolidation",
    "prompt",
    "save",
  ]);

export function formatMemoryLifecyclePhase(
  phase: AiMemoryLifecyclePhase,
): string {
  switch (phase) {
    case "load":
      return "Load";
    case "working":
      return "Working";
    case "episodic":
      return "Episodic";
    case "retrieval":
      return "Retrieval";
    case "semantic":
      return "Semantic";
    case "knowledge":
      return "Knowledge";
    case "long-term":
      return "Long-Term";
    case "ranking":
      return "Ranking";
    case "context":
      return "Context";
    case "consolidation":
      return "Consolidation";
    case "prompt":
      return "Prompt";
    case "save":
      return "Save";
    case "idle":
      return "Idle";
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

export interface AiMemoryLifecyclePlan {
  readonly phases: readonly AiMemoryLifecyclePhase[];
  readonly activePhase: AiMemoryLifecyclePhase;
  readonly summary: string;
}

export function buildMemoryLifecyclePlan(
  activePhase: AiMemoryLifecyclePhase = "load",
): AiMemoryLifecyclePlan {
  return Object.freeze({
    phases: AI_MEMORY_LIFECYCLE_ORDER,
    activePhase,
    summary: `Memory lifecycle ready; active=${formatMemoryLifecyclePhase(activePhase)}`,
  });
}
