/**
 * API Version middleware — resolve → validate → normalize → attach req.apiVersion.
 * Sits before controllers; never bypasses JWT / Session / Zero Trust / RBAC.
 */

import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import {
  API_VERSION_HEADER,
  API_VERSION_RESPONSE_HEADER,
  API_VERSION_URI_PREFIX,
} from "./api-version.constants.js";
import {
  getApiVersionConfig,
  isApiVersioningEnabled,
} from "./api-version.config.js";
import { applyRouteAlias } from "./api-version.compatibility.js";
import { getApiVersionDefinition } from "./api-version.registry.js";
import { apiVersionService } from "./api-version.service.js";

const URI_VERSION_RE = /^\/api\/v(\d+)(?:\/|$)/i;
const ACCEPT_VERSION_RE =
  /application\/vnd\.eliteflow\.v(\d+)\+json/i;

function extractUriVersion(path: string): string | null {
  const match = path.match(URI_VERSION_RE);
  return match?.[1] ?? null;
}

function extractHeaderVersion(req: Request): string | null {
  const cfg = getApiVersionConfig();
  const raw = req.get(cfg.headerName) ?? req.get("api-version");
  if (!raw) return null;
  return raw.trim() || null;
}

function extractAcceptVersion(req: Request): string | null {
  const accept = req.get("accept");
  if (!accept) return null;
  const match = accept.match(ACCEPT_VERSION_RE);
  return match?.[1] ?? null;
}

/**
 * Global middleware: resolve API version for /api/* requests.
 */
export function apiVersionMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!isApiVersioningEnabled()) {
        next();
        return;
      }

      const path = req.path || req.url || "";
      if (!path.startsWith(API_VERSION_URI_PREFIX)) {
        next();
        return;
      }

      const cfg = getApiVersionConfig();
      const uriVersion = extractUriVersion(path);
      const headerVersion = extractHeaderVersion(req);
      const acceptVersion = extractAcceptVersion(req);

      // Explicit URI version that is not in the registry → reject.
      if (uriVersion && !getApiVersionDefinition(uriVersion)) {
        apiVersionService.recordUnsupported(uriVersion);
        next(
          new AppError(
            `Unsupported API version: v${uriVersion}`,
            400,
            "API_VERSION_UNSUPPORTED",
          ),
        );
        return;
      }

      const resolved = apiVersionService.resolve({
        uriVersion,
        headerVersion,
        acceptVersion,
      });

      if (!resolved) {
        const requested = uriVersion ?? headerVersion ?? acceptVersion;
        apiVersionService.recordUnsupported(requested);
        if (cfg.rejectUnsupported) {
          next(
            new AppError(
              requested
                ? `Unsupported API version: ${requested}`
                : "Unsupported API version",
              400,
              "API_VERSION_UNSUPPORTED",
            ),
          );
          return;
        }
        next();
        return;
      }

      req.apiVersion = resolved;
      apiVersionService.recordUsage(resolved);

      res.setHeader(API_VERSION_RESPONSE_HEADER, resolved.version);
      res.setHeader(API_VERSION_HEADER, resolved.version);

      const deprecation = apiVersionService.deprecationHeaders(resolved);
      for (const [key, value] of Object.entries(deprecation)) {
        if (value) res.setHeader(key, value);
      }

      // Route alias rewrite relative to version root (no controller duplication).
      const versionRoot = `${API_VERSION_URI_PREFIX}/v${resolved.version}`;
      if (path.startsWith(versionRoot)) {
        const relative = path.slice(versionRoot.length) || "/";
        const aliased = applyRouteAlias(resolved.definition, relative);
        if (aliased.aliased) {
          const queryIndex = req.url.indexOf("?");
          const query = queryIndex >= 0 ? req.url.slice(queryIndex) : "";
          req.url = `${versionRoot}${aliased.path}${query}`;
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
