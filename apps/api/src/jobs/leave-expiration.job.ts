import { leaveApprovalWorkflowService } from "../modules/team/workflows/index.js";

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let leaveExpireTimer: NodeJS.Timeout | null = null;

/**
 * Periodic leave request expiration (LEAVE_AUTO_EXPIRE_DAYS).
 */
export async function runLeaveExpirationOnce(): Promise<void> {
  const result = await leaveApprovalWorkflowService.expireStaleLeaves();
  if (result.expired > 0) {
    console.info(`[leave-workflow] expired=${result.expired} pending leave(s)`);
  }
}

export function startLeaveExpirationJob(
  intervalMs = DEFAULT_INTERVAL_MS,
): void {
  if (leaveExpireTimer) return;

  const schedule = () => {
    void runLeaveExpirationOnce().catch((error) => {
      console.error("[leave-workflow] Expiration job failed:", error);
    });
  };

  setTimeout(schedule, 60_000);
  leaveExpireTimer = setInterval(schedule, intervalMs);

  if (typeof leaveExpireTimer.unref === "function") {
    leaveExpireTimer.unref();
  }

  console.info(
    `[leave-workflow] Expiration job scheduled every ${Math.round(intervalMs / 3600000)} hour(s)`,
  );
}

export function stopLeaveExpirationJob(): void {
  if (leaveExpireTimer) {
    clearInterval(leaveExpireTimer);
    leaveExpireTimer = null;
  }
}
