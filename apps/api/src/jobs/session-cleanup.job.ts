import { authService } from "../modules/auth/auth.service.js";

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Background cleanup for idle sessions, expired refresh tokens,
 * old revoked sessions, and optionally aged audit logs.
 */
export async function runSessionCleanupOnce(): Promise<void> {
  const result = await authService.cleanupExpiredSessions();

  console.info(
    `[cleanup] sessions idle=${result.idleSessions} ` +
      `refreshTokens=${result.expiredRefreshTokens} ` +
      `revokedSessions=${result.deletedRevokedSessions} ` +
      `auditLogs=${result.deletedAuditLogs}`,
  );
}

export function startSessionCleanupJob(
  intervalMs = DEFAULT_INTERVAL_MS,
): void {
  if (cleanupTimer) {
    return;
  }

  const schedule = () => {
    void runSessionCleanupOnce().catch((error) => {
      console.error("[cleanup] Session cleanup failed:", error);
    });
  };

  // Delay first run slightly so the server can finish booting.
  setTimeout(schedule, 15_000);
  cleanupTimer = setInterval(schedule, intervalMs);

  if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }

  console.info(
    `[cleanup] Session cleanup job scheduled every ${Math.round(intervalMs / 60000)} minutes`,
  );
}

export function stopSessionCleanupJob(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
