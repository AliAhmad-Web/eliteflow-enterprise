/**
 * Background job helpers for deferred memory save / cleanup.
 */

export type MemoryBackgroundJob = () => Promise<void>;

const pending: MemoryBackgroundJob[] = [];
let draining = false;

async function drainQueue(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    while (pending.length > 0) {
      const job = pending.shift();
      if (!job) continue;
      try {
        await job();
      } catch {
        // Best-effort background persistence — never fail the request path.
      }
    }
  } finally {
    draining = false;
  }
}

/**
 * Schedule a best-effort background job (batched drain).
 */
export function enqueueMemoryBackgroundJob(job: MemoryBackgroundJob): void {
  pending.push(job);
  setImmediate(() => {
    void drainQueue();
  });
}

/**
 * Run immediately or defer based on background flag.
 */
export async function runMemoryJob(
  job: MemoryBackgroundJob,
  options: { readonly background?: boolean } = {},
): Promise<void> {
  if (options.background) {
    enqueueMemoryBackgroundJob(job);
    return;
  }
  await job();
}

export function pendingMemoryJobCount(): number {
  return pending.length;
}
