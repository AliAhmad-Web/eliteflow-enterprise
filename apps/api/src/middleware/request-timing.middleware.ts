import type { NextFunction, Request, Response } from "express";

import {
  isApiSaasObservabilityEnabled,
  isApiSaasUsageMetricsEnabled,
} from "../config/saas-flags.js";
import { logSaasPerformanceSummary } from "../shared/services/saas-health.helpers.js";
import { recordSaasRequest } from "../shared/services/saas-metrics.service.js";

/**
 * Logs slow requests for observability (Phase 20).
 * Set LOG_REQUEST_TIMING=true for all requests; SLOW_REQUEST_MS controls warn threshold.
 * When SAAS_OBSERVABILITY / SAAS_USAGE_METRICS are ON, records lightweight in-process metrics.
 */
export function requestTiming(
  thresholdMs = Number(process.env.SLOW_REQUEST_MS ?? 500),
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const started = process.hrtime.bigint();

    res.on("finish", () => {
      const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
      const rounded = Math.round(elapsedMs * 100) / 100;
      const route = req.originalUrl?.split("?")[0] ?? req.url;
      const slow = elapsedMs >= thresholdMs;

      if (isApiSaasUsageMetricsEnabled()) {
        recordSaasRequest({ slow });
      }

      if (slow) {
        console.warn(
          `[perf] slow_request method=${req.method} path=${route} status=${res.statusCode} ms=${rounded}`,
        );
      } else if (process.env.LOG_REQUEST_TIMING === "true") {
        console.info(
          `[perf] request method=${req.method} path=${route} status=${res.statusCode} ms=${rounded}`,
        );
      }

      if (isApiSaasObservabilityEnabled()) {
        logSaasPerformanceSummary({
          method: req.method,
          path: route,
          status: res.statusCode,
          ms: rounded,
        });
      }
    });

    next();
  };
}
