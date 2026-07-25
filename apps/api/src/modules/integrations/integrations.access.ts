/**
 * Shared Integration Center access control — single source of truth for RBAC.
 */

import { PERMISSIONS, UserRole } from "@enterprise/shared";

import {
  INTEGRATIONS_ERROR_CODES,
  IntegrationsError,
} from "./integrations.errors.js";
import { INTEGRATIONS_MESSAGES } from "./integrations.constants.js";
import { integrationsRepository } from "./integrations.repository.js";
import type { IntegrationsActor } from "./integrations.types.js";

export function hasPermission(actor: IntegrationsActor, key: string): boolean {
  return actor.permissions.includes(key) || actor.permissions.includes("*");
}

export function canManageIntegrations(actor: IntegrationsActor): boolean {
  return (
    actor.role === UserRole.SUPER_ADMIN ||
    actor.role === UserRole.ADMIN ||
    hasPermission(actor, PERMISSIONS.INTEGRATIONS_MANAGE)
  );
}

export function canReadIntegrations(actor: IntegrationsActor): boolean {
  return (
    canManageIntegrations(actor) ||
    hasPermission(actor, PERMISSIONS.INTEGRATIONS_READ) ||
    actor.role === UserRole.SUPER_ADMIN ||
    actor.role === UserRole.ADMIN ||
    actor.role === UserRole.EMPLOYEE ||
    actor.role === UserRole.CLIENT
  );
}

export function requireRead(actor: IntegrationsActor): void {
  if (!canReadIntegrations(actor)) {
    throw new IntegrationsError(
      INTEGRATIONS_MESSAGES.VIEW_FORBIDDEN,
      403,
      INTEGRATIONS_ERROR_CODES.FORBIDDEN,
    );
  }
}

export function requireManage(actor: IntegrationsActor): void {
  if (!canManageIntegrations(actor)) {
    throw new IntegrationsError(
      INTEGRATIONS_MESSAGES.FORBIDDEN,
      403,
      INTEGRATIONS_ERROR_CODES.FORBIDDEN,
    );
  }
}

export function assertVisible(
  actor: IntegrationsActor,
  integration: {
    visibleToEmployee: boolean;
    visibleToClient: boolean;
  },
): void {
  if (canManageIntegrations(actor)) return;
  if (actor.role === UserRole.CLIENT && !integration.visibleToClient) {
    throw new IntegrationsError(
      INTEGRATIONS_MESSAGES.VIEW_FORBIDDEN,
      403,
      INTEGRATIONS_ERROR_CODES.FORBIDDEN,
    );
  }
  if (actor.role === UserRole.EMPLOYEE && !integration.visibleToEmployee) {
    throw new IntegrationsError(
      INTEGRATIONS_MESSAGES.VIEW_FORBIDDEN,
      403,
      INTEGRATIONS_ERROR_CODES.FORBIDDEN,
    );
  }
}

export async function resolveAllowedIds(
  actor: IntegrationsActor,
): Promise<string[] | null> {
  if (canManageIntegrations(actor)) return null;
  const visible = await integrationsRepository.listIntegrations({
    visibility: { role: String(actor.role), canManage: false },
  });
  return visible.map((row) => row.id);
}

export async function requireIntegrationAccess(
  actor: IntegrationsActor,
  idOrSlug: string,
) {
  requireRead(actor);
  await integrationsRepository.ensureCatalogSeeded();
  const row = await integrationsRepository.resolveByIdOrSlug(idOrSlug);
  if (!row) {
    throw new IntegrationsError(
      INTEGRATIONS_MESSAGES.NOT_FOUND,
      404,
      INTEGRATIONS_ERROR_CODES.NOT_FOUND,
    );
  }
  assertVisible(actor, row);
  return row;
}
