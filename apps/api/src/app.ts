import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { API_PREFIX } from "@enterprise/shared";

import { getCorsOrigins } from "./config/auth.config.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { csrfProtection } from "./middleware/csrf.middleware.js";
import { requestTiming } from "./middleware/request-timing.middleware.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(requestTiming());
  app.use(compression());
  app.use(
    helmet({
      // API returns JSON only; CSP is enforced by the Next.js frontend.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: getCorsOrigins(),
      credentials: true,
      exposedHeaders: [
        "Content-Disposition",
        "Content-Type",
        "Server-Timing",
      ],
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(csrfProtection);

  app.use(API_PREFIX, apiRouter);

  app.use(errorHandler);

  return app;
}
