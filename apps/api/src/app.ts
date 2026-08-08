import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import express from "express";

import { API_PREFIX } from "@enterprise/shared";

import { getCorsOrigins } from "./config/auth.config.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { requestTiming } from "./middleware/request-timing.middleware.js";
import { apiRouter } from "./routes/index.js";
import { apiVersionMiddleware } from "./shared/api-versioning/index.js";
import { csrfProtection } from "./shared/security/csrf/index.js";
import { installConsoleRedaction } from "./shared/security/install-console-redaction.js";
import { securityHeadersMiddleware } from "./shared/security/security-headers/index.js";

export function createApp() {
  installConsoleRedaction();

  const app = express();

  app.set("trust proxy", 1);
  // Defense in depth — Helmet also hides this when headers are enabled.
  app.disable("x-powered-by");

  app.use(requestTiming());
  app.use(compression());
  app.use(securityHeadersMiddleware());
  app.use(
    cors({
      origin: getCorsOrigins(),
      credentials: true,
      exposedHeaders: [
        "Content-Disposition",
        "Content-Type",
        "Server-Timing",
        "RateLimit-Limit",
        "RateLimit-Remaining",
        "RateLimit-Reset",
        "Retry-After",
        "X-CSRF-Token",
        "X-API-Version",
        "API-Version",
        "Deprecation",
        "Sunset",
        "Link",
        "Warning",
      ],
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(csrfProtection);

  // Browser-friendly: API has no UI at /. Send people to the Next.js app.
  app.get("/", (_req, res) => {
    const webUrl = process.env.WEB_APP_URL ?? "http://localhost:3000";
    res.redirect(302, webUrl);
  });

  // Enterprise API Versioning — before controllers; never bypasses auth stack.
  app.use(apiVersionMiddleware());

  // Version 1 — existing routes (backward compatible).
  app.use(API_PREFIX, apiRouter);

  // Version 2 — experimental; same controllers via compatibility (no duplication).
  app.use("/api/v2", apiRouter);

  app.use(errorHandler);

  return app;
}
