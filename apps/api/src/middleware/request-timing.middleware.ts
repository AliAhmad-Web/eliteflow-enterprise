import type { NextFunction, Request, Response } from "express";

/**
 * Logs slow requests for observability (Phase 20).
 * Set LOG_REQUEST_TIMING=true for all requests; SLOW_REQUEST_MS controls warn threshold.
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

      if (elapsedMs >= thresholdMs) {
        console.warn(
          `[perf] slow_request method=${req.method} path=${route} status=${res.statusCode} ms=${rounded}`,
        );
      } else if (process.env.LOG_REQUEST_TIMING === "true") {
        console.info(
          `[perf] request method=${req.method} path=${route} status=${res.statusCode} ms=${rounded}`,
        );
      }
    });

    next();
  };
}
