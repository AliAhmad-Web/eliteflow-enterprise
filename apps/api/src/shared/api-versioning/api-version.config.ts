/**
 * Enterprise API Versioning — env configuration.
 *
 * Env:
 * - SECURITY_API_VERSIONING / API_VERSIONING_ENABLED (default ON)
 * - API_DEFAULT_VERSION (default "1")
 * - API_LATEST_VERSION (default "1")
 * - API_VERSION_REJECT_UNSUPPORTED (default ON)
 */

import type { ApiVersionConfig } from "./api-version.types.js";
import { API_VERSION_HEADER } from "./api-version.constants.js";

function parseEnvFlag(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return defaultValue;
  switch (normalized) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return defaultValue;
  }
}

let cached: ApiVersionConfig | null = null;

export function getApiVersionConfig(forceRefresh = false): ApiVersionConfig {
  if (cached && !forceRefresh) return cached;
  const defaultVersion = (process.env.API_DEFAULT_VERSION ?? "1").trim() || "1";
  const latestVersion = (process.env.API_LATEST_VERSION ?? defaultVersion)
    .trim() || defaultVersion;
  cached = {
    enabled: parseEnvFlag(
      process.env.SECURITY_API_VERSIONING ?? process.env.API_VERSIONING_ENABLED,
      true,
    ),
    defaultVersion,
    latestVersion,
    headerName: API_VERSION_HEADER,
    vendorMediaType: "application/vnd.eliteflow",
    rejectUnsupported: parseEnvFlag(
      process.env.API_VERSION_REJECT_UNSUPPORTED,
      true,
    ),
  };
  return cached;
}

export function resetApiVersionConfigCache(): void {
  cached = null;
}

export function isApiVersioningEnabled(): boolean {
  return getApiVersionConfig().enabled;
}
