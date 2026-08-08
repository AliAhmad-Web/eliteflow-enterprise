import {
  backupValidationService,
  getBackupValidationConfig,
  isBackupValidationEnabled,
} from "../shared/security/backup-validation/index.js";

let validationTimer: NodeJS.Timeout | null = null;

/**
 * Periodic backup validation (validate only — never creates backups).
 */
export async function runBackupValidationOnce(): Promise<void> {
  if (!isBackupValidationEnabled()) {
    console.info("[backup-validation] skipped (disabled)");
    return;
  }

  const result = await backupValidationService.runValidation({
    validationType: "AUTOMATIC",
    triggeredBy: "scheduler",
  });

  console.info(
    `[backup-validation] run=${result.runId} health=${result.health} ` +
      `coverage=${result.coveragePercent}% total=${result.totalBackups} ` +
      `failed=${result.failed} corrupted=${result.corrupted} ` +
      `ms=${result.durationMs}`,
  );
}

export function startBackupValidationJob(): void {
  if (validationTimer) return;

  const cfg = getBackupValidationConfig();
  if (!cfg.enabled) {
    console.info("[backup-validation] scheduler not started (disabled)");
    return;
  }

  const schedule = () => {
    void runBackupValidationOnce().catch((error) => {
      console.error("[backup-validation] Scheduled validation failed:", error);
    });
  };

  // Delay first run so the server can finish booting.
  setTimeout(schedule, 60_000);
  validationTimer = setInterval(schedule, cfg.scheduleIntervalMs);

  if (typeof validationTimer.unref === "function") {
    validationTimer.unref();
  }

  console.info(
    `[backup-validation] Scheduled every ${Math.round(cfg.scheduleIntervalMs / 3600000)} hours`,
  );
}

export function stopBackupValidationJob(): void {
  if (validationTimer) {
    clearInterval(validationTimer);
    validationTimer = null;
  }
}
