import type { NextFunction, Request, Response } from "express";

import { AUTH_ERROR_CODES } from "@enterprise/shared";

import { AppError } from "../shared/errors/app-error.js";
import { errorResponse } from "../shared/utils/api-response.js";
import { AuthError } from "../modules/auth/auth.errors.js";
import { securityMonitoringService } from "../shared/security/monitoring/index.js";

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AuthError || error instanceof AppError) {
    if (error.statusCode >= 500) {
      void securityMonitoringService.reportApiError({
        userId: req.auth?.userId ?? null,
        resource: "api",
        resourceId: req.originalUrl,
        message: "API server error",
        metadata: {
          statusCode: error.statusCode,
          code: error.code,
          method: req.method,
        },
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });
    }

    res.status(error.statusCode).json(
      errorResponse(error.message, error.code, error.errors),
    );
    return;
  }

  console.error("[api] Unhandled error:", error);

  void securityMonitoringService.reportApiError({
    userId: req.auth?.userId ?? null,
    resource: "api",
    resourceId: req.originalUrl,
    message: "Unhandled API error",
    metadata: {
      statusCode: 500,
      method: req.method,
    },
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  });

  res.status(500).json(
    errorResponse(
      "An unexpected error occurred",
      AUTH_ERROR_CODES.INTERNAL_ERROR,
    ),
  );
}
