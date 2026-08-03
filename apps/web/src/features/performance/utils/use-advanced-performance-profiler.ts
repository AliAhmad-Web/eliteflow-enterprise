"use client";

import { useEffect, useRef } from "react";

import {
  isPerformanceAdvProfilingEnabled,
  isPerformanceRenderProfilingEnabled,
} from "../feature-flags";

/**
 * Extends Task 1.4 render profiling with ADV navigation / query / mount timing (dev only).
 * No-ops unless PERFORMANCE_ADV_PROFILING (or WEB_VITALS alias) / RENDER_PROFILING is ON.
 */
export function useAdvancedPerformanceProfiler(label: string): void {
  const countRef = useRef(0);
  const mountedAtRef = useRef<number>(0);

  useEffect(() => {
    const adv = isPerformanceAdvProfilingEnabled();
    const basic = isPerformanceRenderProfilingEnabled();
    if (!adv && !basic) return;
    if (process.env.NODE_ENV === "production") return;

    countRef.current += 1;
    console.info(
      `[perf-render] label=${label} count=${countRef.current}`,
    );
  });

  useEffect(() => {
    if (!isPerformanceAdvProfilingEnabled()) return;
    if (process.env.NODE_ENV === "production") return;

    mountedAtRef.current = performance.now();
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

    if (nav) {
      console.info(
        `[perf-nav] label=${label} domContentLoaded=${Math.round(nav.domContentLoadedEventEnd)} load=${Math.round(nav.loadEventEnd)}`,
      );
    }

    const resourceEntries = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    const fetchLike = resourceEntries.filter(
      (entry) =>
        entry.initiatorType === "fetch" || entry.initiatorType === "xmlhttprequest",
    );
    if (fetchLike.length > 0) {
      const totalMs = fetchLike.reduce((sum, entry) => sum + entry.duration, 0);
      console.info(
        `[perf-query] label=${label} networkRequests=${fetchLike.length} totalDurationMs=${Math.round(totalMs)}`,
      );
    }

    return () => {
      const elapsed = performance.now() - mountedAtRef.current;
      console.info(
        `[perf-mount] label=${label} mountedMs=${Math.round(elapsed)}`,
      );
    };
  }, [label]);
}
