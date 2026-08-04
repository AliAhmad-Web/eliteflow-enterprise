import { performanceEngineService } from "../modules/team/performance-engine.service.js";

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

let recalcTimer: NodeJS.Timeout | null = null;

export async function runPerformanceRecalcOnce(): Promise<void> {
  const result = await performanceEngineService.recalculateAll();
  console.info(
    `[performance] recalculated employees=${result.processed} alerts=${result.alerts}`,
  );

  const now = new Date();
  // Weekly reports every Monday UTC.
  if (now.getUTCDay() === 1) {
    const count = await performanceEngineService.generatePeriodReports(
      "WEEKLY",
      now,
    );
    console.info(`[performance] weekly reports generated=${count}`);
  }
  // Generate monthly reports on the 1st–2nd UTC of each month.
  if (now.getUTCDate() <= 2) {
    const previous = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15),
    );
    const count = await performanceEngineService.generateMonthlyReports(previous);
    console.info(`[performance] monthly reports generated=${count}`);
    const periodCount = await performanceEngineService.generatePeriodReports(
      "MONTHLY",
      previous,
    );
    console.info(`[performance] period monthly reports generated=${periodCount}`);
  }
  // Quarterly on first 2 days of Jan/Apr/Jul/Oct.
  if (now.getUTCDate() <= 2 && [0, 3, 6, 9].includes(now.getUTCMonth())) {
    const qDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
    const count = await performanceEngineService.generatePeriodReports(
      "QUARTERLY",
      qDate,
    );
    console.info(`[performance] quarterly reports generated=${count}`);
  }
  // Annual on Jan 1–2.
  if (now.getUTCMonth() === 0 && now.getUTCDate() <= 2) {
    const prevYear = new Date(Date.UTC(now.getUTCFullYear() - 1, 6, 1));
    const count = await performanceEngineService.generatePeriodReports(
      "ANNUAL",
      prevYear,
    );
    console.info(`[performance] annual reports generated=${count}`);
  }
}

export function startPerformanceRecalcJob(
  intervalMs = DEFAULT_INTERVAL_MS,
): void {
  if (recalcTimer) return;

  const schedule = () => {
    void runPerformanceRecalcOnce().catch((error) => {
      console.error("[performance] Score recalculation failed:", error);
    });
  };

  setTimeout(schedule, 45_000);
  recalcTimer = setInterval(schedule, intervalMs);
  if (typeof recalcTimer.unref === "function") {
    recalcTimer.unref();
  }

  console.info(
    `[performance] Recalc job scheduled every ${Math.round(intervalMs / 60000)} minutes`,
  );
}

export function stopPerformanceRecalcJob(): void {
  if (recalcTimer) {
    clearInterval(recalcTimer);
    recalcTimer = null;
  }
}
