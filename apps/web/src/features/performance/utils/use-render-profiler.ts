"use client";

import { useEffect, useRef } from "react";

import { isPerformanceRenderProfilingEnabled } from "../feature-flags";

/**
 * Dev-oriented render counter. No-ops unless PERFORMANCE_RENDER_PROFILING is ON.
 * Does not alter UI or data flow.
 */
export function useRenderProfiler(label: string): void {
  const countRef = useRef(0);

  useEffect(() => {
    if (!isPerformanceRenderProfilingEnabled()) return;
    if (process.env.NODE_ENV === "production") return;

    countRef.current += 1;
    console.info(
      `[perf-render] label=${label} count=${countRef.current}`,
    );
  });
}
