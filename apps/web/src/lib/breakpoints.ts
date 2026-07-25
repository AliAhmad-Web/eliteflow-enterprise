/**
 * EliteFlow responsive breakpoints (aligned with design system §2.9 / Tailwind defaults).
 * Mobile-first: base styles target the smallest viewport; min-width queries add complexity.
 */
export const BREAKPOINTS = {
  /** Large mobile */
  sm: 640,
  /** Tablet portrait */
  md: 768,
  /** Tablet landscape / small laptop */
  lg: 1024,
  /** Laptop / desktop */
  xl: 1280,
  /** Large desktop */
  "2xl": 1536,
  /** Ultra-wide monitors */
  uw: 2560,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

export const MEDIA_QUERIES = {
  sm: `(min-width: ${BREAKPOINTS.sm}px)`,
  md: `(min-width: ${BREAKPOINTS.md}px)`,
  lg: `(min-width: ${BREAKPOINTS.lg}px)`,
  xl: `(min-width: ${BREAKPOINTS.xl}px)`,
  "2xl": `(min-width: ${BREAKPOINTS["2xl"]}px)`,
  uw: `(min-width: ${BREAKPOINTS.uw}px)`,
  /** Coarse pointer (typical touch devices) */
  touch: "(hover: none) and (pointer: coarse)",
  reducedMotion: "(prefers-reduced-motion: reduce)",
} as const;

export function minWidthQuery(px: number): string {
  return `(min-width: ${px}px)`;
}
