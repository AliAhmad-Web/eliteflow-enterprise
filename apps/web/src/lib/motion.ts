/**
 * Motion presets for EliteFlow V3 — short, soft enterprise transitions.
 * Prefer CSS `prefers-reduced-motion` (globals.css) for hard disables.
 */

const enterpriseEase = [0.22, 1, 0.36, 1] as const;

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: enterpriseEase },
} as const;

export const slideUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: 0.24, ease: enterpriseEase },
} as const;

export const scaleIn = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.2, ease: enterpriseEase },
} as const;

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.045,
    },
  },
} as const;

/** Instant variants for touch / reduced-motion contexts */
export const motionInstant = {
  initial: false,
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0 },
} as const;
