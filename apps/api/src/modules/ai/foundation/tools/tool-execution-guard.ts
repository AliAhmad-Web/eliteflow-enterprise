/**
 * Pre-flight guards for real tool execution.
 * RBAC, privacy mode, organization boundaries, active-context checks.
 */

import { type PermissionSubject } from "@enterprise/shared";

import { permissionService } from "../../../../shared/services/permission.service.js";
import type { AiToolDefinition } from "./tool-catalog.js";
import type { AiToolExecutionContext } from "./tool-execution-context.js";

export class ToolExecutionGuardError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ToolExecutionGuardError";
    this.code = code;
  }
}

function subjectFromContext(
  context: AiToolExecutionContext,
): PermissionSubject {
  return {
    role: context.role ?? context.activeContext.user?.role ?? "EMPLOYEE",
    permissions: [...(context.permissions ?? [])],
  };
}

/**
 * Enforce privacy, permissions, org, and entity requirements before a real run.
 */
export function assertToolExecutionAllowed(
  definition: AiToolDefinition,
  context: AiToolExecutionContext,
): void {
  if (context.policy.privacyMode) {
    throw new ToolExecutionGuardError(
      "Tool execution blocked: privacy mode is enabled",
      "PRIVACY_MODE",
    );
  }

  if (!context.userId?.trim()) {
    throw new ToolExecutionGuardError(
      "Tool execution blocked: authenticated user required",
      "UNAUTHENTICATED",
    );
  }

  const subject = subjectFromContext(context);
  if (
    !permissionService.hasAllPermissions(
      subject,
      definition.requiredPermissions,
    )
  ) {
    throw new ToolExecutionGuardError(
      `Tool execution blocked: missing permissions for '${definition.id}'`,
      "FORBIDDEN",
    );
  }

  if (definition.requiresOrganization) {
    if (!context.activeContext.organization?.organizationId) {
      throw new ToolExecutionGuardError(
        "Tool execution blocked: organization context required",
        "ORG_REQUIRED",
      );
    }
  }

  if (
    definition.requiresEntityTypes &&
    definition.requiresEntityTypes.length > 0
  ) {
    const types = new Set(
      context.activeContext.entities.map((e) => e.type.toLowerCase()),
    );
    if (context.activeContext.primaryEntity?.type) {
      types.add(context.activeContext.primaryEntity.type.toLowerCase());
    }
    const matched = definition.requiresEntityTypes.some((type) =>
      types.has(type.toLowerCase()),
    );
    if (!matched) {
      throw new ToolExecutionGuardError(
        `Tool execution blocked: required entity type not in active context`,
        "ENTITY_REQUIRED",
      );
    }
  }

  // Soft identity boundary for write-capable tools.
  const ctxUser = context.activeContext.user?.userId;
  if (ctxUser && ctxUser !== context.userId) {
    throw new ToolExecutionGuardError(
      "Tool execution blocked: active context user mismatch",
      "CONTEXT_USER_MISMATCH",
    );
  }
}
