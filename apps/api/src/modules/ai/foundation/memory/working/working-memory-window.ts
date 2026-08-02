/**
 * Working memory reasoning window.
 */

export interface AiWorkingMemoryWindow {
  readonly size: number;
  readonly focus: string | null;
  readonly objective: string | null;
  readonly activeTask: string | null;
}

export function buildWorkingMemoryWindow(input: {
  readonly entryCount: number;
  readonly focus?: string | null;
  readonly objective?: string | null;
  readonly activeTask?: string | null;
}): AiWorkingMemoryWindow {
  return Object.freeze({
    size: Math.max(0, input.entryCount),
    focus: input.focus?.trim() || null,
    objective: input.objective?.trim() || null,
    activeTask: input.activeTask?.trim() || null,
  });
}
