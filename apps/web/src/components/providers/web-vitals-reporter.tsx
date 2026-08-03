"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useEffect } from "react";

import { isPerformanceAdvProfilingEnabled } from "@/features/performance";

/**
 * Forwards Core Web Vitals to the console in development and to
 * `window.__ELITEFLOW_VITALS__` for production monitoring hooks.
 *
 * When PERFORMANCE_ADV_PROFILING is ON (dev), also logs script/resource counts.
 */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (typeof window !== "undefined") {
      const store =
        (
          window as Window & {
            __ELITEFLOW_VITALS__?: Array<typeof metric>;
          }
        ).__ELITEFLOW_VITALS__ ?? [];
      store.push(metric);
      (
        window as Window & { __ELITEFLOW_VITALS__?: Array<typeof metric> }
      ).__ELITEFLOW_VITALS__ = store;
    }

    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[web-vital] name=${metric.name} value=${Math.round(metric.value)} id=${metric.id}`,
      );
    }
  });

  useEffect(() => {
    if (!isPerformanceAdvProfilingEnabled()) return;
    if (process.env.NODE_ENV === "production") return;
    if (typeof performance === "undefined") return;

    const scripts = performance
      .getEntriesByType("resource")
      .filter((entry) => {
        const r = entry as PerformanceResourceTiming;
        return r.initiatorType === "script" || r.name.includes(".js");
      });

    console.info(
      `[perf-bundle] scriptResources=${scripts.length} transferApproxBytes=${Math.round(
        scripts.reduce(
          (sum, entry) =>
            sum + ((entry as PerformanceResourceTiming).transferSize || 0),
          0,
        ),
      )}`,
    );
  }, []);

  return null;
}
