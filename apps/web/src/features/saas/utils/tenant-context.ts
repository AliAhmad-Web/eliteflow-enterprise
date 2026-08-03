/**
 * Tenant context helpers (Phase 8 Phase 2) — web.
 * Reuses organization key "default" / workspace concepts. No schema changes.
 */

import { isSaasTenantReadinessEnabled } from "../feature-flags";

export const SAAS_DEFAULT_ORGANIZATION_KEY = "default" as const;
export const SAAS_DEFAULT_WORKSPACE_ID = "default-workspace" as const;

export interface SaasWebTenantContext {
  organizationKey: string;
  organizationId: string | null;
  workspaceId: string | null;
}

export function resolveWebTenantContext(input?: {
  organizationKey?: string | null;
  organizationId?: string | null;
  workspaceId?: string | null;
}): SaasWebTenantContext {
  if (!isSaasTenantReadinessEnabled()) {
    return {
      organizationKey: SAAS_DEFAULT_ORGANIZATION_KEY,
      organizationId: null,
      workspaceId: null,
    };
  }
  return {
    organizationKey:
      input?.organizationKey?.trim() || SAAS_DEFAULT_ORGANIZATION_KEY,
    organizationId: input?.organizationId?.trim() || null,
    workspaceId: input?.workspaceId?.trim() || SAAS_DEFAULT_WORKSPACE_ID,
  };
}

/** Stable React Query key segment for tenant-aware caches. */
export function buildTenantQueryKeySegment(
  context?: SaasWebTenantContext,
): string {
  const ctx = context ?? resolveWebTenantContext();
  if (!isSaasTenantReadinessEnabled()) {
    return "global";
  }
  return [
    "tenant",
    ctx.organizationKey,
    ctx.organizationId ?? "none",
    ctx.workspaceId ?? SAAS_DEFAULT_WORKSPACE_ID,
  ].join(":");
}

/**
 * Compose list filters with optional tenant metadata (non-breaking).
 * Does not alter API query params — for client-side composition / future use.
 */
export function composeTenantSafeQueryParams<T extends Record<string, unknown>>(
  base: T,
  context?: SaasWebTenantContext,
): T & { _tenantKey?: string } {
  if (!isSaasTenantReadinessEnabled()) {
    return base;
  }
  const ctx = context ?? resolveWebTenantContext();
  return {
    ...base,
    _tenantKey: buildTenantQueryKeySegment(ctx),
  };
}

export function buildTenantAwarePersistStorageKey(
  baseKey: string,
  context?: SaasWebTenantContext,
): string {
  if (!isSaasTenantReadinessEnabled()) {
    return baseKey;
  }
  return `${baseKey}:${buildTenantQueryKeySegment(context)}`;
}
