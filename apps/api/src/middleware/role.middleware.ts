import type { NextFunction, Request, Response } from "express";

import {
  AUTH_ERROR_CODES,
  hasAnyRole,
  UserRole,
} from "@enterprise/shared";

import { AuthError } from "../modules/auth/auth.errors.js";
import { logAuthorizationDenied } from "../shared/services/authorization-audit.service.js";

/**
 * Requires the authenticated user to have one of the specified roles.
 */
export function authorizeRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.auth) {
        throw new AuthError(
          "Authentication required",
          401,
          AUTH_ERROR_CODES.TOKEN_INVALID,
        );
      }

      if (!hasAnyRole(req.auth, roles)) {
        void logAuthorizationDenied({
          req,
          reason: "role_mismatch",
          requiredRoles: roles,
        });

        throw new AuthError(
          "You do not have permission to perform this action",
          403,
          AUTH_ERROR_CODES.FORBIDDEN,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
