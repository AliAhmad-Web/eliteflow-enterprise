import type { NextFunction, Request, Response } from "express";

import {
  PUBLIC_API_ERROR_CODES,
  type PublicApiScope,
} from "@enterprise/shared";

import type { PublicApiKeyRecord } from "./public-api-keys.repository.js";
import { publicApiKeysService } from "./public-api-keys.service.js";
import { PublicApiError } from "./public-api.errors.js";
import { getPublicRequestId } from "./public-api.response.js";

export type PublicApiAuthContext = {
  keyId: string;
  keyPrefix: string;
  scopes: string[];
  ownerUserId: string;
  /** Company isolation binding — null means org-wide (admin key). */
  clientId: string | null;
};

declare global {
  namespace Express {
    interface Request {
      publicApi?: PublicApiAuthContext;
    }
  }
}

function extractApiKey(req: Request): string | null {
  const headerKey = req.get("x-api-key");
  if (headerKey && headerKey.trim()) return headerKey.trim();

  const auth = req.get("authorization");
  if (!auth) return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return match?.[1]?.trim() ?? null;
}

export function publicApiContractMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = getPublicRequestId(req);
  res.locals.requestId = requestId;
  res.locals.publicApiContract = true;
  res.setHeader("X-Request-Id", requestId);
  next();
}

export async function authenticatePublicApiKey(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const raw = extractApiKey(req);
    if (!raw) {
      throw new PublicApiError(
        "API key is required",
        401,
        PUBLIC_API_ERROR_CODES.UNAUTHORIZED,
      );
    }

    const record = await publicApiKeysService.authenticateRawKey(raw);
    req.publicApi = toAuthContext(record);
    next();
  } catch (error) {
    next(error);
  }
}

export function requirePublicScopes(...required: PublicApiScope[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const ctx = req.publicApi;
    if (!ctx) {
      next(
        new PublicApiError(
          "API key is required",
          401,
          PUBLIC_API_ERROR_CODES.UNAUTHORIZED,
        ),
      );
      return;
    }

    const missing = required.filter((scope) => !ctx.scopes.includes(scope));
    if (missing.length > 0) {
      next(
        new PublicApiError(
          `Missing required scope: ${missing.join(", ")}`,
          403,
          PUBLIC_API_ERROR_CODES.MISSING_SCOPE,
        ),
      );
      return;
    }

    next();
  };
}

function toAuthContext(record: PublicApiKeyRecord): PublicApiAuthContext {
  return {
    keyId: record.id,
    keyPrefix: record.keyPrefix,
    scopes: record.scopes,
    ownerUserId: record.ownerUserId,
    clientId: record.clientId,
  };
}
