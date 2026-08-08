/**
 * API Version Compatibility Layer.
 * Alias routes, identity response transforms, legacy DTO mapping hooks,
 * and version fallback — without duplicating controller logic.
 */

import type {
  ApiVersionDefinition,
  ResolvedApiVersion,
} from "./api-version.types.js";
import {
  getApiVersionDefinition,
  getDefaultVersionDefinition,
  normalizeVersionToken,
} from "./api-version.registry.js";

/**
 * Resolve a requested version token to a concrete definition,
 * applying aliases and fallback chains.
 */
export function resolveCompatibleVersion(input: {
  requested: string | null;
  source: ResolvedApiVersion["source"];
}): ResolvedApiVersion | null {
  if (!input.requested) {
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

  const normalized = normalizeVersionToken(input.requested);
  if (!normalized) return null;

  let def = getApiVersionDefinition(normalized);
  let usedFallback = false;
  let source = input.source;

  // Alias resolution already folded into normalizeVersionToken for named aliases;
  // if token differed from raw digits, mark as ALIAS.
  const rawNorm = input.requested.trim().toLowerCase().replace(/^v/, "");
  if (def && rawNorm !== def.version && !/^\d+$/.test(rawNorm.split(".")[0] ?? "")) {
    source = "ALIAS";
  }

  if (!def) return null;

  // Sunset / missing handlers → follow fallback chain (no controller duplication).
  if (def.status === "SUNSET" && def.compatibility.fallbackTo) {
    const fallback = getApiVersionDefinition(def.compatibility.fallbackTo);
    if (fallback) {
      def = fallback;
      usedFallback = true;
      source = "FALLBACK";
    }
  } else if (
    def.compatibility.fallbackTo &&
    def.status === "EXPERIMENTAL"
  ) {
    // Experimental versions share v1 controllers via fallback flag for metrics,
    // but still report the requested experimental version as active.
    // Controllers are the same mount — usedFallback tracks compatibility usage.
    usedFallback = true;
  }

  return {
    version: def.version,
    major: def.major,
    status: def.status,
    source,
    usedFallback,
    requested: input.requested,
    definition: def,
  };
}

/**
 * Map a request path (relative to version root) through route aliases.
 * Returns original path when no alias exists.
 */
export function applyRouteAlias(
  definition: ApiVersionDefinition,
  relativePath: string,
): { path: string; aliased: boolean } {
  const path = relativePath.startsWith("/")
    ? relativePath
    : `/${relativePath}`;
  const mapped = definition.compatibility.routeAliases[path];
  if (!mapped) return { path, aliased: false };
  return { path: mapped.startsWith("/") ? mapped : `/${mapped}`, aliased: true };
}

/**
 * Response transform hook — identity by default (no DTO redesign).
 * Controllers keep emitting current shapes; transforms may wrap later.
 */
export function transformResponseForVersion<T>(
  definition: ApiVersionDefinition,
  payload: T,
): T {
  if (!definition.compatibility.responseTransform) return payload;
  // Reserved for future named transforms — never mutates by default.
  return payload;
}

/**
 * Legacy DTO mapping hook — identity by default.
 */
export function mapLegacyDtoForVersion<T>(
  definition: ApiVersionDefinition,
  dto: T,
): T {
  if (!definition.compatibility.legacyDtoMapping) return dto;
  return dto;
}

export function buildDeprecationHeaders(definition: ApiVersionDefinition): {
  Deprecation?: string;
  Sunset?: string;
  Link?: string;
  Warning?: string;
} {
  if (definition.status !== "DEPRECATED" && definition.status !== "SUNSET") {
    return {};
  }
  const headers: {
    Deprecation?: string;
    Sunset?: string;
    Link?: string;
    Warning?: string;
  } = {
    Deprecation: definition.deprecationDate
      ? `date="${definition.deprecationDate}"`
      : "true",
  };
  if (definition.sunsetDate) {
    headers.Sunset = definition.sunsetDate;
  }
  if (definition.documentationUrl) {
    headers.Link = `<${definition.documentationUrl}>; rel="deprecation"; type="text/html"`;
  }
  headers.Warning = `299 - "API version ${definition.version} is ${definition.status.toLowerCase()}"`;
  return headers;
}
