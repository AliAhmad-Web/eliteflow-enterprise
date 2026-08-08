import { dataRetentionService } from "../shared/security/data-retention/index.js";

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let retentionTimer: NodeJS.Timeout | null = null;

/**
 * Periodic enterprise data retention processor.
 * Archives eligible records and securely deletes when policy allows.
 */
export async function runRetentionProcessorOnce(): Promise<void> {
  const result = await dataRetentionService.runRetentionProcessor({
    triggeredBy: "scheduler",
  });

  console.info(
    `[retention] run=${result.runId} status=${result.status} ` +
      `archived=${result.itemsArchived} deleted=${result.itemsDeleted} ` +
      `legalHolds=${result.legalHolds} failures=${result.failures} ` +
      `ms=${result.executionTime}`,
  );
}

export function startRetentionProcessorJob(
  intervalMs = DEFAULT_INTERVAL_MS,
): void {
  if (retentionTimer) {
    return;
  }

  const schedule = () => {
    void runRetentionProcessorOnce().catch((error) => {
      console.error("[retention] Retention processor failed:", error);
    });
  };

  // Delay first run so the server can finish booting.
  setTimeout(schedule, 45_000);
  retentionTimer = setInterval(schedule, intervalMs);

  if (typeof retentionTimer.unref === "function") {
    retentionTimer.unref();
  }

  console.info(
    `[retention] Retention processor scheduled every ${Math.round(intervalMs / 3600000)} hours`,
  );
}

export function stopRetentionProcessorJob(): void {
  if (retentionTimer) {
    clearInterval(retentionTimer);
    retentionTimer = null;
  }
}
