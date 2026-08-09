/**
 * Radix Dialog/Sheet (DismissableLayer) sets `document.body.style.pointerEvents = "none"`
 * while open. Soft navigation or nested modal open/close in the same tick can skip
 * cleanup and leave the entire app click-dead until a hard refresh.
 */

const RESTORE_DELAY_MS = 0;

let restoreTimer: ReturnType<typeof setTimeout> | null = null;

export function hasOpenRadixOverlay(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector(
      '[role="dialog"][data-state="open"], [data-slot="dialog-overlay"][data-state="open"], [data-slot="sheet-overlay"][data-state="open"]',
    ),
  );
}

/** Clear a leaked body pointer-events lock when no overlay is open. */
export function restoreBodyInteractionIfIdle(): void {
  if (typeof document === "undefined") return;
  if (hasOpenRadixOverlay()) return;

  if (document.body.style.pointerEvents === "none") {
    document.body.style.removeProperty("pointer-events");
  }
}

/**
 * Schedule a restore after the current close commit / Presence teardown.
 * Safe to call repeatedly; coalesces into one timer.
 */
export function scheduleRestoreBodyInteraction(): void {
  if (typeof window === "undefined") return;
  if (restoreTimer) {
    clearTimeout(restoreTimer);
  }
  restoreTimer = setTimeout(() => {
    restoreTimer = null;
    // Double-rAF: wait for React commit + Radix layout effect cleanup.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        restoreBodyInteractionIfIdle();
      });
    });
  }, RESTORE_DELAY_MS);
}

/**
 * Run work after overlay close so App Router soft-nav does not race DismissableLayer.
 */
export function scheduleAfterOverlayClose(work: () => void, delayMs = 50): void {
  if (typeof window === "undefined") {
    work();
    return;
  }
  window.setTimeout(() => {
    work();
    scheduleRestoreBodyInteraction();
  }, delayMs);
}
