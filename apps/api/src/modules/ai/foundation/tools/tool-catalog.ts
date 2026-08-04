import { PERMISSIONS } from "@enterprise/shared";

import type { AiFoundationSurface } from "../contracts/ai-execution-context.js";
import type { AiToolId } from "../contracts/ai-tool-execution.js";

/**
 * Static catalog of future AI tools.
 * Eligibility only — no executors live here.
 */
export interface AiToolDefinition {
  readonly id: AiToolId;
  /** All listed permissions are required. */
  readonly requiredPermissions: readonly string[];
  /**
   * When set, tool is only eligible for these module keys.
   * null/undefined = any module.
   */
  readonly modules?: readonly string[] | null;
  /**
   * When set, tool is only eligible for these surfaces.
   * null/undefined = any surface.
   */
  readonly surfaces?: readonly AiFoundationSurface[] | null;
  /**
   * When set, at least one active context entity must match one of these types.
   */
  readonly requiresEntityTypes?: readonly string[] | null;
  /** When true, organization identity must be present on active context. */
  readonly requiresOrganization?: boolean;
}

export const AI_TOOL_CATALOG: readonly AiToolDefinition[] = [
  {
    id: "draft_email",
    requiredPermissions: [PERMISSIONS.AI_USE],
    modules: ["ai", "communication", "clients"],
    surfaces: ["ASSISTANT", "COMMUNICATION", "DOCUMENTS"],
  },
  {
    id: "save_ai_document",
    requiredPermissions: [PERMISSIONS.AI_USE],
    modules: ["ai"],
    surfaces: ["ASSISTANT", "DOCUMENTS"],
  },
  {
    id: "summarize_content",
    requiredPermissions: [PERMISSIONS.AI_USE],
  },
  {
    id: "create_task",
    requiredPermissions: [PERMISSIONS.TASKS_WRITE],
    modules: ["ai", "tasks", "projects", "communication"],
    surfaces: ["ASSISTANT", "COMMUNICATION", "WHITEBOARD"],
  },
  {
    id: "create_calendar_event",
    requiredPermissions: [PERMISSIONS.CALENDAR_WRITE],
    modules: ["ai", "calendar", "communication"],
    surfaces: ["ASSISTANT", "COMMUNICATION"],
  },
  {
    id: "analyze_project",
    requiredPermissions: [PERMISSIONS.PROJECTS_READ],
    modules: ["ai", "projects", "reports"],
    surfaces: ["ASSISTANT", "REPORTS"],
    requiresEntityTypes: ["project", "projects"],
  },
  {
    id: "analyze_report",
    requiredPermissions: [PERMISSIONS.REPORTS_READ],
    modules: ["ai", "reports"],
    surfaces: ["ASSISTANT", "REPORTS"],
  },
  {
    id: "lookup_client",
    requiredPermissions: [PERMISSIONS.CLIENTS_READ],
    modules: ["ai", "clients", "projects"],
    surfaces: ["ASSISTANT", "COMMUNICATION"],
    requiresEntityTypes: ["client", "clients"],
  },
  {
    id: "hire_employee",
    requiredPermissions: [PERMISSIONS.TEAM_MANAGE],
    modules: ["team", "ai"],
    surfaces: ["ASSISTANT"],
  },
  {
    id: "transfer_employee",
    requiredPermissions: [PERMISSIONS.TEAM_MANAGE],
    modules: ["team", "ai"],
    surfaces: ["ASSISTANT"],
    requiresEntityTypes: ["employee", "employees"],
  },
  {
    id: "list_team_directory",
    requiredPermissions: [PERMISSIONS.TEAM_READ],
    modules: ["team", "ai"],
    surfaces: ["ASSISTANT"],
  },
  {
    id: "generate_employee_id_card",
    requiredPermissions: [PERMISSIONS.TEAM_READ],
    modules: ["team", "ai"],
    surfaces: ["ASSISTANT"],
    requiresEntityTypes: ["employee", "employees"],
  },
  {
    id: "list_employees_on_leave",
    requiredPermissions: [PERMISSIONS.TEAM_READ],
    modules: ["team", "ai"],
    surfaces: ["ASSISTANT"],
  },
  {
    id: "list_missing_attendance",
    requiredPermissions: [PERMISSIONS.TEAM_READ],
    modules: ["team", "ai"],
    surfaces: ["ASSISTANT"],
  },
] as const;
