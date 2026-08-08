/**
 * Enterprise API Versioning — types.
 */

export const API_VERSION_STATUSES = [
  "SUPPORTED",
  "DEPRECATED",
  "EXPERIMENTAL",
  "SUNSET",
] as const;

export type ApiVersionStatus = (typeof API_VERSION_STATUSES)[number];

export const API_VERSION_SOURCES = [
  "URI",
  "HEADER",
  "ACCEPT",
  "DEFAULT",
  "ALIAS",
  "FALLBACK",
] as const;

export type ApiVersionSource = (typeof API_VERSION_SOURCES)[number];

export interface ApiVersionCompatibility {
  /** Prefer this version when requested version needs fallback. */
  fallbackTo: string | null;
  /** Alias names that resolve to this version (e.g. "stable", "latest"). */
  aliases: string[];
  /** Route path aliases: requested path → canonical path (relative to version root). */
  routeAliases: Record<string, string>;
  /** Optional response transform id (identity when null). */
  responseTransform: string | null;
  /** Optional legacy DTO mapping id (none when null). */
  legacyDtoMapping: string | null;
}

export interface ApiVersionDefinition {
  version: string;
  major: number;
  status: ApiVersionStatus;
  releaseDate: string;
  deprecationDate: string | null;
  sunsetDate: string | null;
  /** Relative route prefixes this version serves (e.g. "/auth"). Empty = all current. */
  supportedRoutes: string[];
  compatibility: ApiVersionCompatibility;
  documentationUrl: string | null;
}

export interface ResolvedApiVersion {
  version: string;
  major: number;
  status: ApiVersionStatus;
  source: ApiVersionSource;
  /** True when resolved via compatibility fallback. */
  usedFallback: boolean;
  /** Original requested token before alias/fallback normalization. */
  requested: string | null;
  definition: ApiVersionDefinition;
}

export interface ApiVersionConfig {
  enabled: boolean;
  defaultVersion: string;
  latestVersion: string;
  headerName: string;
  vendorMediaType: string;
  /** Reject requests that cannot be resolved to a known version. */
  rejectUnsupported: boolean;
}

export interface ApiVersionTrafficStats {
  version: string;
  count: number;
  deprecatedCount: number;
  fallbackCount: number;
}

export interface ApiVersionDashboardMetrics {
  supportedVersions: number;
  deprecatedVersions: number;
  experimentalVersions: number;
  traffic: number;
  fallbackCount: number;
  unsupportedCount: number;
  versions: Array<{
    version: string;
    status: ApiVersionStatus;
    traffic: number;
  }>;
}

export interface ApiVersionStatusSnapshot {
  enabled: boolean;
  defaultVersion: string;
  latestVersion: string;
  supportedVersions: string[];
  deprecatedVersions: string[];
  experimentalVersions: string[];
  traffic: number;
  fallbackCount: number;
  unsupportedCount: number;
  evaluatedAt: string;
}

export interface ApiVersionCompatibilitySnapshot {
  versions: Array<{
    version: string;
    status: ApiVersionStatus;
    fallbackTo: string | null;
    aliases: string[];
    routeAliasCount: number;
    responseTransform: string | null;
    legacyDtoMapping: string | null;
  }>;
  evaluatedAt: string;
}
