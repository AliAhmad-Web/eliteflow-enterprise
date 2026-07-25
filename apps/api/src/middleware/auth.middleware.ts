import type { NextFunction, Request, Response } from "express";

import { AUTH_ERROR_CODES, AUTH_HEADERS } from "@enterprise/shared";

import { AuthError } from "../modules/auth/auth.errors.js";
import { verifyAccessToken } from "../modules/auth/auth.tokens.js";

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const header = req.headers[AUTH_HEADERS.AUTHORIZATION.toLowerCase()];

    if (typeof header !== "string" || !header.startsWith(AUTH_HEADERS.BEARER_PREFIX)) {
      throw new AuthError(
        "Authentication required",
        401,
        AUTH_ERROR_CODES.TOKEN_INVALID,
      );
    }

    const token = header.slice(AUTH_HEADERS.BEARER_PREFIX.length);
    const payload = verifyAccessToken(token);

    req.auth = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
      sessionId: payload.sessionId,
    };

    next();
  } catch (error) {
    next(error);
  }
}
