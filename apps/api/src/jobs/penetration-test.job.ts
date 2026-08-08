import {
  getPentestConfig,
  isPentestEnabled,
  penetrationTestService,
} from "../shared/security/penetration-test/index.js";

let pentestTimer: NodeJS.Timeout | null = null;

/** Periodic security assessment — never exploits or mutates data. */
export async function runPenetrationTestOnce(): Promise<void> {
  if (!isPentestEnabled()) {
    console.info("[penetration-test] skipped (disabled)");
    return;
  }

  const result = await penetrationTestService.runAssessment({
    testType: "READINESS_ASSESSMENT",
    triggeredBy: "scheduler",
  });

  console.info(
    `[penetration-test] run=${result.runId} score=${result.overallScore} ` +
      `maturity=${result.securityMaturity} failed=${result.failedControls} ` +
      `critical=${result.riskSummary.critical}`,
  );
}

export function startPenetrationTestJob(): void {
  if (pentestTimer) return;

  const cfg = getPentestConfig();
  if (!cfg.enabled) {
    console.info("[penetration-test] scheduler not started (disabled)");
    return;
  }

  const schedule = () => {
    void runPenetrationTestOnce().catch((error) => {
      console.error("[penetration-test] Scheduled assessment failed:", error);
    });
  };

  setTimeout(schedule, 120_000);
  pentestTimer = setInterval(schedule, cfg.scheduleIntervalMs);

  if (typeof pentestTimer.unref === "function") {
    pentestTimer.unref();
  }

  console.info(
    `[penetration-test] Scheduled every ${Math.round(cfg.scheduleIntervalMs / 3600000)} hours`,
  );
}

export function stopPenetrationTestJob(): void {
  if (pentestTimer) {
    clearInterval(pentestTimer);
    pentestTimer = null;
  }
}
