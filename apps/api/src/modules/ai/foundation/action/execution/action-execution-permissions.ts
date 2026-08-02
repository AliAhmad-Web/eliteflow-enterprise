/**
 * Action execution permissions — reuse shared permission service +
 * existing module read permission map. Never bypasses authorization.
 * Never accesses Prisma/repos.
 */

import { permissionService } from "../../../../../shared/services/permission.service.js";
import { MODULE_READ_PERMISSIONS } from "../../modules/data/module-data-helpers.js";
import type { AiActionCategory } from "../action-definition.js";
import type { AiActionExecutionContext } from "./action-execution-context.js";
import { toPermissionSubject } from "./action-execution-context.js";

const CATEGORY_TO_MODULE_PERMISSION: Record<AiActionCategory, string> =
  Object.freeze({
    task: MODULE_READ_PERMISSIONS.tasks,
    project: MODULE_READ_PERMISSIONS.projects,
    crm: MODULE_READ_PERMISSIONS.crm,
    calendar: MODULE_READ_PERMISSIONS.calendar,
    document: MODULE_READ_PERMISSIONS.documents,
    report: MODULE_READ_PERMISSIONS.reports,
    email: MODULE_READ_PERMISSIONS.crm,
    workflow: MODULE_READ_PERMISSIONS.documents,
    notification: MODULE_READ_PERMISSIONS.notifications,
    storage: MODULE_READ_PERMISSIONS.storage,
    settings: MODULE_READ_PERMISSIONS.settings,
    generic: MODULE_READ_PERMISSIONS.documents,
  });

export const ACTION_READ_PERMISSIONS = CATEGORY_TO_MODULE_PERMISSION;

export interface AiActionPermissionDecision {
  readonly allowed: boolean;
  readonly permission: string;
  readonly reason: string;
}

export function resolveActionPermission(
  category: AiActionCategory,
): string {
  return CATEGORY_TO_MODULE_PERMISSION[category];
}

export function evaluateActionPermissions(
  context: AiActionExecutionContext,
  category: AiActionCategory,
): AiActionPermissionDecision {
  if (context.privacyMode) {
    return Object.freeze({
      allowed: false,
      permission: resolveActionPermission(category),
      reason: "privacy-mode",
    });
  }

  const subject = toPermissionSubject(context);
  if (!subject) {
    return Object.freeze({
      allowed: false,
      permission: resolveActionPermission(category),
      reason: "missing-user",
    });
  }

  const permission = resolveActionPermission(category);
  const allowed = permissionService.hasPermission(subject, permission);

  return Object.freeze({
    allowed,
    permission,
    reason: allowed ? "granted" : "permission-denied",
  });
}
