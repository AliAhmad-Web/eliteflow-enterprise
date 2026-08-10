import type { NextFunction, Request, Response } from "express";

import { AUTH_ERROR_CODES } from "@enterprise/shared";

import { AppError } from "../shared/errors/app-error.js";
import { errorResponse } from "../shared/utils/api-response.js";
import { AuthError } from "../modules/auth/auth.errors.js";
import { securityMonitoringService } from "../shared/security/monitoring/index.js";
import { publicError } from "../modules/public-api/public-api.response.js";

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const usePublicContract = Boolean(res.locals.publicApiContract);

  if (error instanceof AuthError || error instanceof AppError) {
    if (error.statusCode >= 500) {
      void securityMonitoringService.reportApiError({
        userId: req.auth?.userId ?? req.publicApi?.ownerUserId ?? null,
        resource: usePublicContract ? "public_api" : "api",
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

    if (usePublicContract) {
      publicError(res, error.statusCode, error.code, error.message);
      return;
    }

    res.status(error.statusCode).json(
      errorResponse(error.message, error.code, error.errors),
    );
    return;
  }

  console.error("[api] Unhandled error:", error);

  void securityMonitoringService.reportApiError({
    userId: req.auth?.userId ?? req.publicApi?.ownerUserId ?? null,
    resource: usePublicContract ? "public_api" : "api",
    resourceId: req.originalUrl,
    message: "Unhandled API error",
    metadata: {
      statusCode: 500,
      method: req.method,
    },
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  });

  if (usePublicContract) {
    publicError(
      res,
      500,
      AUTH_ERROR_CODES.INTERNAL_ERROR,
      "An unexpected error occurred",
    );
    return;
  }

  res.status(500).json(
    errorResponse(
      "An unexpected error occurred",
      AUTH_ERROR_CODES.INTERNAL_ERROR,
    ),
  );
}
