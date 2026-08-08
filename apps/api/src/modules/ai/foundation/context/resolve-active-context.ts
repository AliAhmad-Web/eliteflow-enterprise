import { prisma } from "@enterprise/database";
import {
  PERMISSIONS,
  type PermissionSubject,
} from "@enterprise/shared";

import type {
  AiActiveContext,
  AiContextEntityRef,
  AiContextIdentity,
  AiContextOrganization,
} from "../contracts/ai-active-context.js";
import type { AiFoundationSurface } from "../contracts/ai-execution-context.js";
import { emptyAiActiveContext } from "../contracts/defaults.js";
import { permissionService } from "../../../../shared/services/permission.service.js";
import { SETTINGS_ORG_KEY } from "../../../settings/settings.constants.js";
import { aiDataPolicyService } from "../policy/ai-data-policy.service.js";

/** Optional hints supplied by AiService / future surfaces (no business payloads). */
export interface AiContextHints {
  readonly surface?: AiFoundationSurface;
  readonly module?: string | null;
  readonly conversationId?: string | null;
  readonly mode?: string | null;
  readonly role?: string | null;
  readonly email?: string | null;
  readonly organizationId?: string | null;
  readonly entityRefs?: readonly AiContextEntityRef[];
  /** Optional explicit agent id for Agent Framework resolution. */
  readonly agentId?: string | null;
  /** Optional explicit action id for Action Framework resolution. */
  readonly actionId?: string | null;
  /** When omitted, Context Engine may load keys read-only for permission checks. */
  readonly permissions?: readonly string[];
  /** Session id for confirmation token binding. */
  readonly sessionId?: string | null;
  /** Optional tenant / organization id for confirmation binding. */
  readonly tenantId?: string | null;
  /**
   * Super Admin only — when true, RESTRICTED fields may flow into AI context.
   * Additive optional hint; omitted by default (backward compatible).
   */
  readonly explicitRestrictedAccess?: boolean;
}

export interface ResolveAiActiveContextInput {
  readonly userId?: string | null;
  readonly hints?: AiContextHints | null;
}

const ENTITY_READ_PERMISSION: Record<string, string> = {
  client: PERMISSIONS.CLIENTS_READ,
  clients: PERMISSIONS.CLIENTS_READ,
  project: PERMISSIONS.PROJECTS_READ,
  projects: PERMISSIONS.PROJECTS_READ,
  task: PERMISSIONS.TASKS_READ,
  tasks: PERMISSIONS.TASKS_READ,
  invoice: PERMISSIONS.INVOICES_READ,
  invoices: PERMISSIONS.INVOICES_READ,
  team: PERMISSIONS.TEAM_READ,
  employee: PERMISSIONS.TEAM_READ,
  meeting: PERMISSIONS.COMMUNICATION_READ,
  calendar: PERMISSIONS.CALENDAR_READ,
  report: PERMISSIONS.REPORTS_READ,
  document: PERMISSIONS.AI_USE,
  ai_document: PERMISSIONS.AI_USE,
  conversation: PERMISSIONS.AI_USE,
};

function normalizeEntityType(type: string): string {
  return type.trim().toLowerCase();
}

function requiredPermissionForEntity(type: string): string | null {
  return ENTITY_READ_PERMISSION[normalizeEntityType(type)] ?? null;
}

function resolveModule(hints: AiContextHints | null | undefined): string | null {
  if (hints?.module?.trim()) return hints.module.trim().toLowerCase();
  switch (hints?.surface) {
    case "ASSISTANT":
      return "ai";
    case "DOCUMENTS":
      return "ai";
    case "COMMUNICATION":
      return "communication";
    case "WHITEBOARD":
      return "whiteboards";
    case "REPORTS":
      return "reports";
    default:
      return null;
  }
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

async function resolveOrganization(
  hints: AiContextHints | null | undefined,
): Promise<AiContextOrganization> {
  if (hints?.organizationId?.trim()) {
    return {
      organizationId: hints.organizationId.trim(),
      organizationKey: null,
    };
  }

  const org = await prisma.organizationSettings.findUnique({
    where: { key: SETTINGS_ORG_KEY },
    select: { id: true, key: true },
  });

  return {
    organizationId: org?.id ?? null,
    organizationKey: org?.key ?? SETTINGS_ORG_KEY,
  };
}

function filterEntitiesByPermission(
  refs: readonly AiContextEntityRef[],
  subject: PermissionSubject,
): AiContextEntityRef[] {
  const allowed: AiContextEntityRef[] = [];

  for (const ref of refs) {
    if (!ref.id?.trim() || !ref.type?.trim()) continue;

    const permission = requiredPermissionForEntity(ref.type);
    if (!permission) continue;

    if (!permissionService.hasPermission(subject, permission)) continue;

    allowed.push({
      type: normalizeEntityType(ref.type),
      id: ref.id.trim(),
      label: ref.label?.trim() || undefined,
    });
  }

  return allowed;
}

/**
 * Resolve AiActiveContext metadata only.
 * No CRM/project/task data fetches. No prompt mutation. No provider calls.
 */
export async function resolveAiActiveContext(
  input: ResolveAiActiveContextInput = {},
): Promise<AiActiveContext> {
  const hints = input.hints ?? null;
  const userId = input.userId?.trim() || null;

  if (!userId) {
    return emptyAiActiveContext();
  }

  const role = hints?.role ?? null;
  const permissions =
    hints?.permissions !== undefined
      ? [...hints.permissions]
      : await loadPermissionKeys(userId);

  const subject: PermissionSubject = {
    role: role ?? "EMPLOYEE",
    permissions,
  };

  const user: AiContextIdentity = {
    userId,
    role,
    email: hints?.email ?? null,
  };

  const organization = await resolveOrganization(hints);
  const entities = filterEntitiesByPermission(hints?.entityRefs ?? [], subject);

  const context: AiActiveContext = {
    module: resolveModule(hints),
    surface: hints?.surface ?? "UNKNOWN",
    conversationId: hints?.conversationId ?? null,
    mode: hints?.mode ?? null,
    user,
    organization,
    primaryEntity: entities[0] ?? null,
    entities,
    snippets: [],
    ambientText: null,
  };

  const policySubject = aiDataPolicyService.subjectFrom({
    userId,
    role,
    permissions,
    explicitRestrictedAccess: hints?.explicitRestrictedAccess === true,
  });

  return {
    ...context,
    snippets: aiDataPolicyService.sanitizeAIContext(
      context.snippets,
      policySubject,
    ),
    ambientText: context.ambientText
      ? aiDataPolicyService.sanitizeSummary(context.ambientText, policySubject)
      : null,
  };
}
