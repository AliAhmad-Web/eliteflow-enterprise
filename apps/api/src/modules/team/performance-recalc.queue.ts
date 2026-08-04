import { prisma } from "@enterprise/database";

import { performanceEngineService } from "./performance-engine.service.js";

const pending = new Set<string>();
let flushTimer: NodeJS.Timeout | null = null;
let fullRecalcPending = false;

const DEBOUNCE_MS = 15_000;

/**
 * Queue a debounced performance recalculation after attendance/tasks/activity changes.
 * Pass employeeId to scope; omit for an org-wide pass.
 */
export function queuePerformanceRecalc(employeeId?: string): void {
  if (employeeId) {
    pending.add(employeeId);
  } else {
    fullRecalcPending = true;
  }

  if (flushTimer) return;

  flushTimer = setTimeout(() => {
    flushTimer = null;
    const ids = [...pending];
    pending.clear();
    const runFull = fullRecalcPending;
    fullRecalcPending = false;

    void (async () => {
      try {
        if (runFull) {
          await performanceEngineService.recalculateAll();
          return;
        }
        for (const id of ids) {
          await performanceEngineService.recalculateAll({ employeeId: id });
        }
      } catch (error) {
        console.error("[performance] Debounced recalc failed:", error);
      }
    })();
  }, DEBOUNCE_MS);

  if (typeof flushTimer.unref === "function") {
    flushTimer.unref();
  }
}

/** Resolve an employee profile from a user id, then queue recalc. */
export function queuePerformanceRecalcForUser(userId: string): void {
  void prisma.employeeProfile
    .findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    })
    .then((profile) => {
      if (profile) queuePerformanceRecalc(profile.id);
    })
    .catch((error) => {
      console.error(
        "[performance] Failed to resolve employee for recalc:",
        error,
      );
    });
}
