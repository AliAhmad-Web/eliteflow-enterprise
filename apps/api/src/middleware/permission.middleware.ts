import type { NextFunction, Request, Response } from "express";

import {
  AUTH_ERROR_CODES,
  hasAllPermissions,
  hasAnyPermission,
  type PermissionKey,
} from "@enterprise/shared";

import { AuthError } from "../modules/auth/auth.errors.js";
import { logAuthorizationDenied } from "../shared/services/authorization-audit.service.js";

type PermissionArg = PermissionKey | string;

/**
 * Requires ALL listed permissions (alias of authorizeAllPermissions).
 */
export function authorizePermissions(...permissions: PermissionArg[]) {
  return authorizeAllPermissions(...permissions);
}

/**
 * Requires at least one of the listed permissions.
 */
export function authorizeAnyPermission(...permissions: PermissionArg[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.auth) {
        throw new AuthError(
          "Authentication required",
          401,
          AUTH_ERROR_CODES.TOKEN_INVALID,
        );
      }

      if (!hasAnyPermission(req.auth, permissions)) {
        void logAuthorizationDenied({
          req,
          reason: "permission_denied",
          requiredPermissions: permissions,
          mode: "any",
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

/**
 * Requires every listed permission.
 */
export function authorizeAllPermissions(...permissions: PermissionArg[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.auth) {
        throw new AuthError(
          "Authentication required",
          401,
          AUTH_ERROR_CODES.TOKEN_INVALID,
        );
      }

      if (!hasAllPermissions(req.auth, permissions)) {
        void logAuthorizationDenied({
          req,
          reason: "permission_denied",
          requiredPermissions: permissions,
          mode: "all",
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
