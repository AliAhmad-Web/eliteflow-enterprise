import type { NextFunction, Request, Response } from "express";

import {
  AUTH_ERROR_CODES,
  AUTH_HEADERS,
  type UserRole,
} from "@enterprise/shared";

import { isApiSecurityPermissionRefreshEnabled } from "../config/security-flags.js";
import { AuthError } from "../modules/auth/auth.errors.js";
import { AuthRepository } from "../modules/auth/auth.repository.js";
import { verifyAccessToken } from "../modules/auth/auth.tokens.js";

const authRepository = new AuthRepository();

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers[AUTH_HEADERS.AUTHORIZATION.toLowerCase()];

    if (
      typeof header !== "string" ||
      !header.startsWith(AUTH_HEADERS.BEARER_PREFIX)
    ) {
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

    // Reduce stale JWT permission windows without changing token format.
    if (isApiSecurityPermissionRefreshEnabled()) {
      const user = await authRepository.findUserById(payload.sub);
      if (!user || !user.role) {
        throw new AuthError(
          "Authentication required",
          401,
          AUTH_ERROR_CODES.TOKEN_INVALID,
        );
      }

      req.auth.role = user.role.code as UserRole;
      req.auth.permissions = user.role.rolePermissions.map(
        (rp) => rp.permission.key,
      );
      req.auth.email = user.email;
    }

    next();
  } catch (error) {
    next(error);
  }
}
