/**
 * API Version Registry — single source of truth.
 * Current production routes are Version 1. v2 is experimental with v1 fallback.
 */

import type { ApiVersionDefinition } from "./api-version.types.js";
import { API_VERSION_ALIASES } from "./api-version.constants.js";
import { getApiVersionConfig } from "./api-version.config.js";

/**
 * Supported route modules under /api/v{n}/… (relative).
 * Empty list means "all current modules" for that version.
 */
const V1_ROUTES = [
  "/auth",
  "/clients",
  "/projects",
  "/tasks",
  "/invoices",
  "/ai",
  "/files",
  "/calendar",
  "/team",
  "/reports",
  "/notifications",
  "/communication",
  "/security",
  "/settings",
  "/integrations",
  "/whiteboards",
  "/health",
] as const;

const REGISTRY: ApiVersionDefinition[] = [
  {
    version: "1",
    major: 1,
    status: "SUPPORTED",
    releaseDate: "2025-01-01",
    deprecationDate: null,
    sunsetDate: null,
    supportedRoutes: [...V1_ROUTES],
    compatibility: {
      fallbackTo: null,
      aliases: [
        API_VERSION_ALIASES.STABLE,
        API_VERSION_ALIASES.CURRENT,
        API_VERSION_ALIASES.LATEST,
      ],
      routeAliases: {},
      responseTransform: null,
      legacyDtoMapping: null,
    },
    documentationUrl: "/docs/api/v1",
  },
  {
    version: "2",
    major: 2,
    status: "EXPERIMENTAL",
    releaseDate: "2026-08-06",
    deprecationDate: null,
    sunsetDate: null,
    supportedRoutes: [...V1_ROUTES],
    compatibility: {
      // No duplicated controllers — fall back to v1 handlers.
      fallbackTo: "1",
      aliases: [],
      routeAliases: {},
      responseTransform: null,
      legacyDtoMapping: null,
    },
    documentationUrl: "/docs/api/v2",
  },
];

export function listApiVersions(): ApiVersionDefinition[] {
  return REGISTRY.map((v) => ({
    ...v,
    compatibility: { ...v.compatibility, aliases: [...v.compatibility.aliases] },
    supportedRoutes: [...v.supportedRoutes],
  }));
}

export function getApiVersionDefinition(
  version: string,
): ApiVersionDefinition | null {
  const normalized = normalizeVersionToken(version);
  if (!normalized) return null;
  return REGISTRY.find((v) => v.version === normalized) ?? null;
}

export function normalizeVersionToken(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  let token = raw.trim().toLowerCase();
  if (!token) return null;
  if (token.startsWith("v")) token = token.slice(1);
  // Accept "1.0" → "1"
  if (/^\d+\.\d+/.test(token)) {
    token = token.split(".")[0] ?? token;
  }
  if (!/^\d+$/.test(token)) {
    // May be an alias — resolve via registry
    return resolveAlias(token);
  }
  return token;
}

export function resolveAlias(alias: string): string | null {
  const cfg = getApiVersionConfig();
  const lower = alias.trim().toLowerCase();
  if (
    lower === API_VERSION_ALIASES.LATEST ||
    lower === API_VERSION_ALIASES.STABLE ||
    lower === API_VERSION_ALIASES.CURRENT
  ) {
    return normalizeVersionToken(cfg.latestVersion);
  }
  for (const def of REGISTRY) {
    if (def.compatibility.aliases.some((a) => a.toLowerCase() === lower)) {
      return def.version;
    }
  }
  return null;
}

export function getDefaultVersionDefinition(): ApiVersionDefinition {
  const cfg = getApiVersionConfig();
  return (
    getApiVersionDefinition(cfg.defaultVersion) ??
    REGISTRY[0]!
  );
}

export function getLatestVersionDefinition(): ApiVersionDefinition {
  const cfg = getApiVersionConfig();
  return (
    getApiVersionDefinition(cfg.latestVersion) ??
    getDefaultVersionDefinition()
  );
}

export function isVersionSupported(version: string): boolean {
  const def = getApiVersionDefinition(version);
  if (!def) return false;
  return def.status !== "SUNSET";
}
