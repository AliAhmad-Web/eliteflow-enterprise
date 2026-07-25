import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

import { AUTH_ERROR_CODES } from "@enterprise/shared";

import { AppError, formatZodErrors } from "../shared/errors/app-error.js";

type RequestSource = "body" | "query" | "params";

/**
 * Express 5 exposes `req.query` and `req.params` as getter-only.
 * Parsed values must be reattached with Object.defineProperty.
 */
function assignValidated(
  req: Request,
  source: RequestSource,
  value: unknown,
): void {
  if (source === "body") {
    req.body = value;
    return;
  }

  Object.defineProperty(req, source, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

export function validate<T>(schema: ZodSchema<T>, source: RequestSource = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(
        new AppError(
          "Validation failed",
          400,
          AUTH_ERROR_CODES.VALIDATION_ERROR,
          formatZodErrors(result.error),
        ),
      );
      return;
    }

    assignValidated(req, source, result.data);
    next();
  };
}
