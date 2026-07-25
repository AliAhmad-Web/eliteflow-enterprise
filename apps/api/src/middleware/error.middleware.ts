import type { NextFunction, Request, Response } from "express";

import { AUTH_ERROR_CODES } from "@enterprise/shared";

import { AppError } from "../shared/errors/app-error.js";
import { errorResponse } from "../shared/utils/api-response.js";
import { AuthError } from "../modules/auth/auth.errors.js";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AuthError || error instanceof AppError) {
    res.status(error.statusCode).json(
      errorResponse(error.message, error.code, error.errors),
    );
    return;
  }

  console.error("[api] Unhandled error:", error);

  res.status(500).json(
    errorResponse(
      "An unexpected error occurred",
      AUTH_ERROR_CODES.INTERNAL_ERROR,
    ),
  );
}
