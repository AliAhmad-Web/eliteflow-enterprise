import type { RequestHandler } from "express";

import {
  createSecurityHeadersMiddleware,
  reportSecurityHeadersStartup,
  resolveSecurityHeadersConfig,
} from "./security-headers.service.js";

/**
 * Express middleware entry — apply early in the stack (before routes).
 * Controllers must not set CSP / HSTS / frame / CORP headers themselves.
 */
export function securityHeadersMiddleware(): RequestHandler {
  const config = resolveSecurityHeadersConfig();
  return createSecurityHeadersMiddleware(config);
}

export { reportSecurityHeadersStartup, resolveSecurityHeadersConfig };
