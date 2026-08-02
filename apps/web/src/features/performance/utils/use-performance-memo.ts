"use client";

import { useMemo, type DependencyList } from "react";

import { isPerformanceMemoizationEnabled } from "../feature-flags";

/**
 * When PERFORMANCE_MEMOIZATION is ON → useMemo identity.
 * When OFF → recomputes every render (pre–Phase-2 object identity behavior).
 *
 * Always calls useMemo to satisfy Rules of Hooks.
 */
export function usePerformanceMemo<T>(
  factory: () => T,
  deps: DependencyList,
): T {
  // Caller owns deps; dynamic DependencyList is intentional for this flag gate.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo -- wrapper
  const memoized = useMemo(factory, deps);
  if (!isPerformanceMemoizationEnabled()) {
    return factory();
  }
  return memoized;
}
