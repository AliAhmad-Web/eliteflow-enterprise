/**
 * Tenant-aware helpers for single-tenant EliteFlow (Phase 8 Phase 2).
 * Reuses OrganizationSettings key "default" — no schema changes.
 */

import { SETTINGS_ORG_KEY } from "../../modules/settings/settings.constants.js";
import { isApiSaasTenantReadinessEnabled } from "../../config/saas-flags.js";

export interface SaasTenantContext {
  organizationKey: string;
  organizationId: string | null;
  workspaceId: string | null;
}

const DEFAULT_CONTEXT: SaasTenantContext = {
  organizationKey: SETTINGS_ORG_KEY,
  organizationId: null,
  workspaceId: null,
};

/** Resolve deploy-scoped tenant context (singleton org today). */
export function resolveSaasTenantContext(input?: {
  organizationKey?: string | null;
  organizationId?: string | null;
  workspaceId?: string | null;
}): SaasTenantContext {
  if (!isApiSaasTenantReadinessEnabled()) {
    return { ...DEFAULT_CONTEXT };
  }
  return {
    organizationKey: input?.organizationKey?.trim() || SETTINGS_ORG_KEY,
    organizationId: input?.organizationId?.trim() || null,
    workspaceId: input?.workspaceId?.trim() || null,
  };
}

/**
 * Compose a Prisma-friendly filter fragment for future org scoping.
 * Today returns `{}` (no-op) — single-tenant deployments remain unchanged.
 */
export function composeTenantSafeWhere(input?: {
  organizationId?: string | null;
}): Record<string, never> | { organizationId: string } {
  if (!isApiSaasTenantReadinessEnabled()) {
    return {};
  }
  const orgId = input?.organizationId?.trim();
  if (!orgId) {
    return {};
  }
  // Only apply when callers pass an id AND the target model has the field.
  // Callers must merge carefully — default remains no-op for core tables without org FK.
  return { organizationId: orgId };
}

export function buildTenantCacheKeyPart(context?: SaasTenantContext): string {
  const ctx = context ?? resolveSaasTenantContext();
  if (!isApiSaasTenantReadinessEnabled()) {
    return "global";
  }
  return [
    ctx.organizationKey,
    ctx.organizationId ?? "none",
    ctx.workspaceId ?? "default-workspace",
  ].join(":");
}
