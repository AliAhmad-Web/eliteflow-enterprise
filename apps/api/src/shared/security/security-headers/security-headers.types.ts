/**
 * Enterprise HTTP security headers — Phase 1 Step 4.
 */

export interface SecurityHeadersConfig {
  /** Master switch — when false, middleware is a no-op. */
  enabled: boolean;
  cspEnabled: boolean;
  hstsEnabled: boolean;
  permissionsPolicyEnabled: boolean;
  /** Cross-Origin-Embedder-Policy (require-corp). Off by default — breaks many APIs. */
  coepEnabled: boolean;
  isProduction: boolean;
  /**
   * CORP policy. Default `cross-origin` so the SPA (separate origin) can
   * fetch JSON + file preview/download via CORS. Use `same-origin` only when
   * web and API share an origin.
   */
  crossOriginResourcePolicy: "same-origin" | "same-site" | "cross-origin";
}

export interface SecurityHeadersStartupSnapshot {
  enabled: boolean;
  cspEnabled: boolean;
  hstsEnabled: boolean;
  permissionsPolicyEnabled: boolean;
  coepEnabled: boolean;
  isProduction: boolean;
  crossOriginResourcePolicy: SecurityHeadersConfig["crossOriginResourcePolicy"];
  sensitiveNoStore: true;
  hidePoweredBy: true;
}
