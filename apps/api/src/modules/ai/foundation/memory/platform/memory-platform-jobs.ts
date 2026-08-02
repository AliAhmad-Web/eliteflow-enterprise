/**
 * Background optimization job scheduling for memory platform.
 */

import {
  enqueueMemoryBackgroundJob,
  runMemoryJob,
} from "../persistence/memory-background-jobs.js";

/**
 * Schedule deferred consolidation / cleanup style optimization work.
 * Actual consolidation remains stage-owned; this only schedules follow-up hooks.
 */
export async function scheduleMemoryOptimizationJob(input: {
  readonly recommended: boolean;
  readonly background?: boolean;
  readonly onRun?: () => Promise<void>;
}): Promise<{ readonly scheduled: boolean }> {
  if (!input.recommended || !input.onRun) {
    return Object.freeze({ scheduled: false });
  }

  await runMemoryJob(input.onRun, {
    background: input.background !== false,
  });

  return Object.freeze({ scheduled: true });
}

export function queueMemoryPlatformMaintenance(
  job: () => Promise<void>,
): void {
  enqueueMemoryBackgroundJob(job);
}
