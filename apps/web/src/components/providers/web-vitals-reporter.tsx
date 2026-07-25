"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Forwards Core Web Vitals to the console in development and to
 * `window.__ELITEFLOW_VITALS__` for production monitoring hooks.
 */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (typeof window !== "undefined") {
      const store = (window as Window & {
        __ELITEFLOW_VITALS__?: Array<typeof metric>;
      }).__ELITEFLOW_VITALS__ ?? [];
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

  return null;
}
