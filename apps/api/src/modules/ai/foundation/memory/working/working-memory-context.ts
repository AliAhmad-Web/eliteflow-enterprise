/**
 * Working memory context packet (active reasoning focus).
 */

export interface AiWorkingMemoryContext {
  readonly objective: string | null;
  readonly focus: string | null;
  readonly activeTask: string | null;
  readonly mode: string | null;
  readonly module: string | null;
}

export function buildWorkingMemoryContext(input: {
  readonly userPrompt?: string | null;
  readonly mode?: string | null;
  readonly module?: string | null;
  readonly businessTask?: string | null;
}): AiWorkingMemoryContext {
  const prompt = input.userPrompt?.trim() || "";
  const objective = prompt ? prompt.slice(0, 120) : null;
  return Object.freeze({
    objective,
    focus: objective,
    activeTask: input.businessTask?.trim() || null,
    mode: input.mode ?? null,
    module: input.module ?? null,
  });
}
