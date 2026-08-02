import { prisma } from "@enterprise/database";
import type { PermissionSubject } from "@enterprise/shared";

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";
import type { AiToolExecution } from "../contracts/ai-tool-execution.js";
import type { AiContextHints } from "../context/resolve-active-context.js";
import { permissionService } from "../../../../shared/services/permission.service.js";
import {
  AI_TOOL_CATALOG,
  type AiToolDefinition,
} from "./tool-catalog.js";

export interface ResolveEligibleToolsInput {
  readonly userId?: string | null;
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  readonly contextHints?: AiContextHints | null;
  /**
   * Optional discovered catalog from Tool Discovery.
   * When omitted, uses static AI_TOOL_CATALOG (legacy / discovery-off path).
   */
  readonly catalog?: readonly AiToolDefinition[];
}

async function loadPermissionKeys(userId: string): Promise<string[]> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      role: {
        select: {
          rolePermissions: {
            select: { permission: { select: { key: true } } },
          },
        },
      },
    },
  });

  return (
    user?.role.rolePermissions.map((rp) => rp.permission.key).filter(Boolean) ??
    []
  );
}

function moduleAllowed(
  definition: AiToolDefinition,
  moduleKey: string | null,
): boolean {
  if (!definition.modules || definition.modules.length === 0) return true;
  if (!moduleKey) return false;
  return definition.modules.includes(moduleKey);
}

function surfaceAllowed(
  definition: AiToolDefinition,
  surface: AiActiveContext["surface"],
): boolean {
  if (!definition.surfaces || definition.surfaces.length === 0) return true;
  return definition.surfaces.includes(surface);
}

function entityRequirementMet(
  definition: AiToolDefinition,
  context: AiActiveContext,
): boolean {
  if (!definition.requiresEntityTypes || definition.requiresEntityTypes.length === 0) {
    return true;
  }

  const activeTypes = new Set(
    context.entities.map((entity) => entity.type.toLowerCase()),
  );
  if (context.primaryEntity?.type) {
    activeTypes.add(context.primaryEntity.type.toLowerCase());
  }

  return definition.requiresEntityTypes.some((type) =>
    activeTypes.has(type.toLowerCase()),
  );
}

function organizationRequirementMet(
  definition: AiToolDefinition,
  context: AiActiveContext,
): boolean {
  if (!definition.requiresOrganization) return true;
  return Boolean(context.organization?.organizationId);
}

function isDefinitionEligible(
  definition: AiToolDefinition,
  subject: PermissionSubject,
  context: AiActiveContext,
): boolean {
  if (
    !permissionService.hasAllPermissions(
      subject,
      definition.requiredPermissions,
    )
  ) {
    return false;
  }

  if (!moduleAllowed(definition, context.module)) return false;
  if (!surfaceAllowed(definition, context.surface)) return false;
  if (!entityRequirementMet(definition, context)) return false;
  if (!organizationRequirementMet(definition, context)) return false;

  return true;
}

/**
 * Compute eligible tools for this request.
 * Never executes tools. Never mutates prompts or settings.
 */
export async function resolveEligibleTools(
  input: ResolveEligibleToolsInput,
): Promise<readonly AiToolExecution[]> {
  const userId = input.userId?.trim();
  if (!userId) return [];

  // Privacy mode: no action tools prepared (read/draft tools also withheld).
  if (input.policy.privacyMode) {
    return [];
  }

  const permissions =
    input.contextHints?.permissions !== undefined
      ? [...input.contextHints.permissions]
      : await loadPermissionKeys(userId);

  const subject: PermissionSubject = {
    role: input.activeContext.user?.role ?? input.contextHints?.role ?? "EMPLOYEE",
    permissions,
  };

  const eligible: AiToolExecution[] = [];
  const catalog = input.catalog ?? AI_TOOL_CATALOG;

  for (const definition of catalog) {
    if (!isDefinitionEligible(definition, subject, input.activeContext)) {
      continue;
    }

    eligible.push({
      toolId: definition.id,
      status: "eligible",
    });
  }

  return eligible;
}
