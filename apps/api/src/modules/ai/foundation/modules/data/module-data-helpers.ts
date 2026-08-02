/**
 * Shared helpers for read-only module data providers.
 * Never performs writes. Never bypasses authorization.
 */

import { PERMISSIONS, type PermissionSubject } from "@enterprise/shared";

import { permissionService } from "../../../../../shared/services/permission.service.js";
import type { AiModuleDataContext } from "./module-data-context.js";
import type { AiModuleDataResponse } from "./module-data-response.js";
import type { AiModuleDataSummaryItem } from "./module-data-response.js";

export function buildPermissionSubject(
  context: AiModuleDataContext,
): PermissionSubject | null {
  const userId = context.userId?.trim();
  if (!userId) return null;
  return {
    role: context.role ?? context.activeContext.user?.role ?? "EMPLOYEE",
    permissions: [...(context.permissions ?? [])],
  };
}

export function emptyResponse(
  moduleId: string,
  moduleName: string,
  status: AiModuleDataResponse["status"],
  reason?: string,
): AiModuleDataResponse {
  return Object.freeze({
    moduleId,
    moduleName,
    status,
    summaries: Object.freeze([]),
    fetchedAt: new Date().toISOString(),
    ...(reason ? { reason } : {}),
  });
}

export function okResponse(
  moduleId: string,
  moduleName: string,
  summaries: readonly AiModuleDataSummaryItem[],
): AiModuleDataResponse {
  return Object.freeze({
    moduleId,
    moduleName,
    status: summaries.length > 0 ? "ok" : "empty",
    summaries: Object.freeze([...summaries]),
    fetchedAt: new Date().toISOString(),
  });
}

export function assertCanRead(
  context: AiModuleDataContext,
  permission: string,
): boolean {
  if (context.policy.privacyMode) return false;
  const subject = buildPermissionSubject(context);
  if (!subject) return false;
  return permissionService.hasPermission(subject, permission);
}

export const MODULE_READ_PERMISSIONS = Object.freeze({
  crm: PERMISSIONS.CLIENTS_READ,
  projects: PERMISSIONS.PROJECTS_READ,
  tasks: PERMISSIONS.TASKS_READ,
  hrm: PERMISSIONS.TEAM_READ,
  finance: PERMISSIONS.INVOICES_READ,
  calendar: PERMISSIONS.CALENDAR_READ,
  documents: PERMISSIONS.AI_USE,
  reports: PERMISSIONS.REPORTS_READ,
  notifications: PERMISSIONS.NOTIFICATIONS_READ,
  storage: PERMISSIONS.FILES_READ,
  settings: PERMISSIONS.SETTINGS_MANAGE,
} as const);

export function actorFromContext(context: AiModuleDataContext): {
  userId: string;
  role: string;
  email: string;
} | null {
  const userId = context.userId?.trim();
  if (!userId) return null;
  return {
    userId,
    role: context.role ?? context.activeContext.user?.role ?? "EMPLOYEE",
    email:
      context.email?.trim() ||
      context.activeContext.user?.email?.trim() ||
      "unknown@eliteflow.local",
  };
}

export function privilegedActor(context: AiModuleDataContext): {
  userId: string;
  role: string;
  email: string;
  permissions: string[];
} | null {
  const base = actorFromContext(context);
  if (!base) return null;
  return {
    ...base,
    permissions: [...(context.permissions ?? [])],
  };
}
