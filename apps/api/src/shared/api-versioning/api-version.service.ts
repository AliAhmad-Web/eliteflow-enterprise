/**
 * ApiVersionService — resolve, validate, metrics, admin snapshots.
 */

import { logger } from "../security/logger.js";
import { securityMonitoringService } from "../security/monitoring/index.js";
import { THREAT_DETECTION_TYPES } from "../security/monitoring/monitoring.types.js";
import {
  getApiVersionConfig,
  isApiVersioningEnabled,
} from "./api-version.config.js";
import { API_VERSION_EVENTS } from "./api-version.constants.js";
import {
  buildDeprecationHeaders,
  resolveCompatibleVersion,
} from "./api-version.compatibility.js";
import {
  getDefaultVersionDefinition,
  listApiVersions,
  normalizeVersionToken,
} from "./api-version.registry.js";
import type {
  ApiVersionCompatibilitySnapshot,
  ApiVersionDashboardMetrics,
  ApiVersionSource,
  ApiVersionStatusSnapshot,
  ApiVersionTrafficStats,
  ResolvedApiVersion,
} from "./api-version.types.js";

const traffic = new Map<string, ApiVersionTrafficStats>();
let unsupportedCount = 0;

function bumpTraffic(resolved: ResolvedApiVersion): void {
  const existing = traffic.get(resolved.version) ?? {
    version: resolved.version,
    count: 0,
    deprecatedCount: 0,
    fallbackCount: 0,
  };
  existing.count += 1;
  if (
    resolved.status === "DEPRECATED" ||
    resolved.status === "SUNSET"
  ) {
    existing.deprecatedCount += 1;
  }
  if (resolved.usedFallback) {
    existing.fallbackCount += 1;
  }
  traffic.set(resolved.version, existing);
}

function emitLog(event: string, metadata: Record<string, unknown>): void {
  logger.info(`[api-versioning] ${event}`, metadata);
}

class ApiVersionService {
  isEnabled(): boolean {
    return isApiVersioningEnabled();
  }

  getConfig() {
    return getApiVersionConfig();
  }

  /**
   * Resolve version from candidate sources (caller supplies priority-ordered picks).
   */
  resolve(input: {
    uriVersion?: string | null;
    headerVersion?: string | null;
    acceptVersion?: string | null;
  }): ResolvedApiVersion | null {
    if (!isApiVersioningEnabled()) {
      const def = getDefaultVersionDefinition();
      return {
        version: def.version,
        major: def.major,
        status: def.status,
        source: "DEFAULT",
        usedFallback: false,
        requested: null,
        definition: def,
      };
    }

    const candidates: Array<{ value: string | null; source: ApiVersionSource }> =
      [
        { value: input.uriVersion ?? null, source: "URI" },
        { value: input.headerVersion ?? null, source: "HEADER" },
        { value: input.acceptVersion ?? null, source: "ACCEPT" },
        { value: null, source: "DEFAULT" },
      ];

    for (const candidate of candidates) {
      if (candidate.source === "DEFAULT") {
        return resolveCompatibleVersion({
          requested: null,
          source: "DEFAULT",
        });
      }
      if (!candidate.value) continue;
      const resolved = resolveCompatibleVersion({
        requested: candidate.value,
        source: candidate.source,
      });
      if (resolved) return resolved;
      // Invalid token at this priority — try next source only if empty;
      // unsupported explicit token should fail (handled by caller).
      if (normalizeVersionToken(candidate.value) === null) {
        continue;
      }
      // Known-looking but unsupported
      return null;
    }
    return null;
  }

  recordUsage(resolved: ResolvedApiVersion): void {
    bumpTraffic(resolved);
    emitLog(API_VERSION_EVENTS.API_VERSION_USED, {
      version: resolved.version,
      source: resolved.source,
      status: resolved.status,
    });
    void securityMonitoringService.reportApiVersionEvent({
      type: THREAT_DETECTION_TYPES.API_VERSION_USED,
      resource: "api_version",
      resourceId: resolved.version,
      message: `API version ${resolved.version} used`,
      metadata: {
        source: resolved.source,
        status: resolved.status,
        sanitized: true,
      },
    });

    if (resolved.status === "DEPRECATED" || resolved.status === "SUNSET") {
      emitLog(API_VERSION_EVENTS.DEPRECATED_API_VERSION, {
        version: resolved.version,
      });
      void securityMonitoringService.reportApiVersionEvent({
        type: THREAT_DETECTION_TYPES.DEPRECATED_API_VERSION,
        resource: "api_version",
        resourceId: resolved.version,
        message: `Deprecated API version ${resolved.version}`,
        metadata: { sanitized: true },
      });
    }

    if (resolved.usedFallback) {
      emitLog(API_VERSION_EVENTS.API_VERSION_FALLBACK, {
        version: resolved.version,
        requested: resolved.requested,
      });
      void securityMonitoringService.reportApiVersionEvent({
        type: THREAT_DETECTION_TYPES.API_VERSION_FALLBACK,
        resource: "api_version",
        resourceId: resolved.version,
        message: "API version fallback applied",
        metadata: {
          requested: resolved.requested,
          sanitized: true,
        },
      });
      void securityMonitoringService.reportApiVersionEvent({
        type: THREAT_DETECTION_TYPES.API_VERSION_COMPATIBILITY,
        resource: "api_version",
        resourceId: resolved.version,
        message: "API version compatibility path used",
        metadata: { sanitized: true },
      });
    }
  }

  recordUnsupported(requested: string | null): void {
    unsupportedCount += 1;
    emitLog(API_VERSION_EVENTS.UNSUPPORTED_API_VERSION, {
      requested,
    });
    void securityMonitoringService.reportApiVersionEvent({
      type: THREAT_DETECTION_TYPES.UNSUPPORTED_API_VERSION,
      resource: "api_version",
      message: "Unsupported API version requested",
      metadata: { requested, sanitized: true },
    });
  }

  deprecationHeaders(resolved: ResolvedApiVersion) {
    return buildDeprecationHeaders(resolved.definition);
  }

  getStatus(): ApiVersionStatusSnapshot {
    const cfg = getApiVersionConfig();
    const versions = listApiVersions();
    let totalTraffic = 0;
    let fallbackCount = 0;
    for (const t of traffic.values()) {
      totalTraffic += t.count;
      fallbackCount += t.fallbackCount;
    }
    return {
      enabled: cfg.enabled,
      defaultVersion: cfg.defaultVersion,
      latestVersion: cfg.latestVersion,
      supportedVersions: versions
        .filter((v) => v.status === "SUPPORTED")
        .map((v) => v.version),
      deprecatedVersions: versions
        .filter((v) => v.status === "DEPRECATED")
        .map((v) => v.version),
      experimentalVersions: versions
        .filter((v) => v.status === "EXPERIMENTAL")
        .map((v) => v.version),
      traffic: totalTraffic,
      fallbackCount,
      unsupportedCount,
      evaluatedAt: new Date().toISOString(),
    };
  }

  listVersions() {
    return listApiVersions().map((v) => ({
      version: v.version,
      status: v.status,
      releaseDate: v.releaseDate,
      deprecationDate: v.deprecationDate,
      sunsetDate: v.sunsetDate,
      supportedRoutes: v.supportedRoutes,
      aliases: v.compatibility.aliases,
      fallbackTo: v.compatibility.fallbackTo,
      documentationUrl: v.documentationUrl,
      traffic: traffic.get(v.version)?.count ?? 0,
    }));
  }

  getCompatibility(): ApiVersionCompatibilitySnapshot {
    return {
      versions: listApiVersions().map((v) => ({
        version: v.version,
        status: v.status,
        fallbackTo: v.compatibility.fallbackTo,
        aliases: v.compatibility.aliases,
        routeAliasCount: Object.keys(v.compatibility.routeAliases).length,
        responseTransform: v.compatibility.responseTransform,
        legacyDtoMapping: v.compatibility.legacyDtoMapping,
      })),
      evaluatedAt: new Date().toISOString(),
    };
  }

  getDashboardMetrics(): ApiVersionDashboardMetrics {
    const versions = listApiVersions();
    let totalTraffic = 0;
    let fallbackCount = 0;
    for (const t of traffic.values()) {
      totalTraffic += t.count;
      fallbackCount += t.fallbackCount;
    }
    return {
      supportedVersions: versions.filter((v) => v.status === "SUPPORTED").length,
      deprecatedVersions: versions.filter((v) => v.status === "DEPRECATED")
        .length,
      experimentalVersions: versions.filter((v) => v.status === "EXPERIMENTAL")
        .length,
      traffic: totalTraffic,
      fallbackCount,
      unsupportedCount,
      versions: versions.map((v) => ({
        version: v.version,
        status: v.status,
        traffic: traffic.get(v.version)?.count ?? 0,
      })),
    };
  }
}

export const apiVersionService = new ApiVersionService();
