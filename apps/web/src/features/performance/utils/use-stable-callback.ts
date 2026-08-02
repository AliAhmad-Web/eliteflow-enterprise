"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a stable function identity that always invokes the latest `callback`.
 * Prefer over ad-hoc `useCallback` when dependencies would otherwise churn every render.
 *
 * Behavior-preserving: same call semantics as the latest callback.
 * Gate call-site adoption with `PERFORMANCE_STABLE_CALLBACKS` in Phase 2+.
 */
export function useStableCallback<TArgs extends unknown[], TResult>(
  callback: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: TArgs) => callbackRef.current(...args), []);
}
