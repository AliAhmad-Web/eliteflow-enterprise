import {
  encryptionAuditService,
  getEncryptionAuditConfig,
  isEncryptionAuditEnabled,
} from "../shared/security/encryption-audit/index.js";

let auditTimer: NodeJS.Timeout | null = null;

/**
 * Periodic encryption audit (audit only — never encrypts or rotates keys).
 */
export async function runEncryptionAuditOnce(): Promise<void> {
  if (!isEncryptionAuditEnabled()) {
    console.info("[encryption-audit] skipped (disabled)");
    return;
  }

  const result = await encryptionAuditService.runAudit({
    triggeredBy: "scheduler",
  });

  console.info(
    `[encryption-audit] run=${result.runId} status=${result.status} ` +
      `score=${result.overallScore} coverage=${result.coveragePercent}% ` +
      `weak=${result.weakAlgorithms} ms=${result.durationMs}`,
  );
}

export function startEncryptionAuditJob(): void {
  if (auditTimer) return;

  const cfg = getEncryptionAuditConfig();
  if (!cfg.enabled) {
    console.info("[encryption-audit] scheduler not started (disabled)");
    return;
  }

  const schedule = () => {
    void runEncryptionAuditOnce().catch((error) => {
      console.error("[encryption-audit] Scheduled audit failed:", error);
    });
  };

  setTimeout(schedule, 75_000);
  auditTimer = setInterval(schedule, cfg.scheduleIntervalMs);

  if (typeof auditTimer.unref === "function") {
    auditTimer.unref();
  }

  console.info(
    `[encryption-audit] Scheduled every ${Math.round(cfg.scheduleIntervalMs / 3600000)} hours`,
  );
}

export function stopEncryptionAuditJob(): void {
  if (auditTimer) {
    clearInterval(auditTimer);
    auditTimer = null;
  }
}
