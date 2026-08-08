import {
  disasterRecoveryTestService,
  getDrTestConfig,
  isDrTestEnabled,
} from "../shared/security/disaster-recovery-test/index.js";

let drTestTimer: NodeJS.Timeout | null = null;

/**
 * Periodic DR test simulation — never destructive.
 */
export async function runDisasterRecoveryTestOnce(): Promise<void> {
  if (!isDrTestEnabled()) {
    console.info("[disaster-recovery-test] skipped (disabled)");
    return;
  }

  const result = await disasterRecoveryTestService.runTest({
    testType: "SCHEDULED",
    triggeredBy: "scheduler",
  });

  console.info(
    `[disaster-recovery-test] run=${result.runId} status=${result.status} ` +
      `readiness=${result.overallReadiness} successRate=${result.successRate}% ` +
      `durationMs=${result.recoveryDurationMs}`,
  );
}

export function startDisasterRecoveryTestJob(): void {
  if (drTestTimer) return;

  const cfg = getDrTestConfig();
  if (!cfg.enabled) {
    console.info("[disaster-recovery-test] scheduler not started (disabled)");
    return;
  }

  const schedule = () => {
    void runDisasterRecoveryTestOnce().catch((error) => {
      console.error("[disaster-recovery-test] Scheduled test failed:", error);
    });
  };

  setTimeout(schedule, 90_000);
  drTestTimer = setInterval(schedule, cfg.scheduleIntervalMs);

  if (typeof drTestTimer.unref === "function") {
    drTestTimer.unref();
  }

  console.info(
    `[disaster-recovery-test] Scheduled every ${Math.round(cfg.scheduleIntervalMs / 3600000)} hours`,
  );
}

export function stopDisasterRecoveryTestJob(): void {
  if (drTestTimer) {
    clearInterval(drTestTimer);
    drTestTimer = null;
  }
}
