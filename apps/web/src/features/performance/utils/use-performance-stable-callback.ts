"use client";

import { useStableCallback } from "./use-stable-callback";
import { isPerformanceStableCallbacksEnabled } from "../feature-flags";

/**
 * When PERFORMANCE_STABLE_CALLBACKS is ON → stable identity via useStableCallback.
 * When OFF → returns the latest callback reference (pre–Phase-2 behavior).
 */
export function usePerformanceStableCallback<TArgs extends unknown[], TResult>(
  callback: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
  const stable = useStableCallback(callback);
  return isPerformanceStableCallbacksEnabled() ? stable : callback;
}
