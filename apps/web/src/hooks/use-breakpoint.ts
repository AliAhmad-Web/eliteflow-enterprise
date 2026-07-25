"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { BREAKPOINTS, MEDIA_QUERIES } from "@/lib/breakpoints";

export type ViewportTier =
  | "mobile"
  | "tablet"
  | "laptop"
  | "desktop"
  | "ultrawide";

/**
 * Reactive viewport helpers for layout decisions that cannot be expressed in CSS alone
 * (e.g. swapping table ↔ card row renderers, forcing tablet sidebar collapse).
 */
export function useBreakpoint() {
  const isSmUp = useMediaQuery(MEDIA_QUERIES.sm);
  const isMdUp = useMediaQuery(MEDIA_QUERIES.md);
  const isLgUp = useMediaQuery(MEDIA_QUERIES.lg);
  const isXlUp = useMediaQuery(MEDIA_QUERIES.xl);
  const is2xlUp = useMediaQuery(MEDIA_QUERIES["2xl"]);
  const isUltraWide = useMediaQuery(MEDIA_QUERIES.uw);
  const isTouch = useMediaQuery(MEDIA_QUERIES.touch);
  const prefersReducedMotion = useMediaQuery(MEDIA_QUERIES.reducedMotion);

  const isMobile = !isMdUp;
  const isTablet = isMdUp && !isLgUp;
  const isLaptop = isLgUp && !isXlUp;
  const isDesktop = isXlUp && !isUltraWide;

  let tier: ViewportTier = "mobile";
  if (isUltraWide) {
    tier = "ultrawide";
  } else if (isDesktop || is2xlUp) {
    tier = "desktop";
  } else if (isLaptop) {
    tier = "laptop";
  } else if (isTablet) {
    tier = "tablet";
  }

  return {
    breakpoints: BREAKPOINTS,
    tier,
    isSmUp,
    isMdUp,
    isLgUp,
    isXlUp,
    is2xlUp,
    isUltraWide,
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isTouch,
    prefersReducedMotion,
    /** Fixed sidebar available (tablet+) */
    showFixedSidebar: isMdUp,
    /** Slide-over nav (below tablet) */
    showMobileDrawer: isMobile,
  };
}
