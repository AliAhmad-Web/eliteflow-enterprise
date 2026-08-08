import {
  getApiCrossOriginResourcePolicy,
  isApiCoepEnabled,
  isApiCspEnabled,
  isApiHstsEnabled,
  isApiPermissionsPolicyEnabled,
  isApiSecurityHeadersEnabled,
} from "../../../config/security-flags.js";
import type {
  SecurityHeadersConfig,
  SecurityHeadersStartupSnapshot,
} from "./security-headers.types.js";

const isProduction = (): boolean => process.env.NODE_ENV === "production";

/**
 * Resolve effective header policy from env flags + environment.
 */
export function resolveSecurityHeadersConfig(): SecurityHeadersConfig {
  return {
    enabled: isApiSecurityHeadersEnabled(),
    cspEnabled: isApiCspEnabled(),
    hstsEnabled: isApiHstsEnabled() && isProduction(),
    permissionsPolicyEnabled: isApiPermissionsPolicyEnabled(),
    coepEnabled: isApiCoepEnabled(),
    isProduction: isProduction(),
    crossOriginResourcePolicy: getApiCrossOriginResourcePolicy(),
  };
}

export function toSecurityHeadersStartupSnapshot(
  config: SecurityHeadersConfig = resolveSecurityHeadersConfig(),
): SecurityHeadersStartupSnapshot {
  return {
    enabled: config.enabled,
    cspEnabled: config.cspEnabled,
    hstsEnabled: config.hstsEnabled,
    permissionsPolicyEnabled: config.permissionsPolicyEnabled,
    coepEnabled: config.coepEnabled,
    isProduction: config.isProduction,
    crossOriginResourcePolicy: config.crossOriginResourcePolicy,
    sensitiveNoStore: true,
    hidePoweredBy: true,
  };
}

/**
 * Path prefixes that must never be cached by browsers/proxies.
 * Files preview/download intentionally excluded (delivery headers own that).
 */
export const SENSITIVE_NO_STORE_PREFIXES: readonly string[] = [
  "/api/v1/auth",
  "/api/v1/security",
  "/api/v1/team",
  "/api/v1/invoices",
  "/api/v1/ai",
  "/api/v1/reports",
] as const;

export function isSensitiveNoStorePath(path: string): boolean {
  const normalized = path.split("?")[0] ?? path;
  return SENSITIVE_NO_STORE_PREFIXES.some(
    (prefix) =>
      normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

/**
 * Strict API CSP — blocks script/style execution surfaces.
 * Production: fully locked down.
 * Development: still blocks unsafe-inline / unsafe-eval; form-action
 * allows 'self' for local HTML error pages only.
 */
export function buildCspDirectives(isProd: boolean): Record<string, string[]> {
  const locked: Record<string, string[]> = {
    defaultSrc: ["'none'"],
    baseUri: ["'none'"],
    frameAncestors: ["'none'"],
    objectSrc: ["'none'"],
    scriptSrc: ["'none'"],
    styleSrc: ["'none'"],
    imgSrc: ["'none'"],
    fontSrc: ["'none'"],
    connectSrc: ["'none'"],
    mediaSrc: ["'none'"],
    workerSrc: ["'none'"],
    manifestSrc: ["'none'"],
  };

  if (isProd) {
    return {
      ...locked,
      formAction: ["'none'"],
    };
  }

  return {
    ...locked,
    formAction: ["'self'"],
  };
}

export const PERMISSIONS_POLICY_DIRECTIVES: Readonly<
  Record<string, string[]>
> = {
  accelerometer: [],
  camera: [],
  geolocation: [],
  gyroscope: [],
  magnetometer: [],
  microphone: [],
  payment: [],
  usb: [],
  browsingTopics: [],
  interestCohort: [],
};
