/**
 * Action Executor — calls existing EliteFlow services only.
 * Never accesses Prisma or repositories directly.
 * Never duplicates business logic.
 */

import { clientsService } from "../../../../clients/clients.service.js";
import { projectsService } from "../../../../projects/projects.service.js";
import { tasksService } from "../../../../tasks/tasks.service.js";
import { invoicesService } from "../../../../invoices/invoices.service.js";
import { calendarService } from "../../../../calendar/calendar.service.js";
import { teamService } from "../../../../team/team.service.js";
import { reportsService } from "../../../../reports/reports.service.js";
import { notificationsService } from "../../../../notifications/notifications.service.js";
import { filesService } from "../../../../files/files.service.js";
import { settingsService } from "../../../../settings/settings.service.js";
import { aiService } from "../../../ai.service.js";
import { hireEmployeeSchema } from "@enterprise/shared";

import type { AiActionCategory } from "../action-definition.js";
import type { AiActionStep } from "../planning/action-step.js";
import type { AiActionExecutionContext } from "./action-execution-context.js";
import {
  toPrivilegedServiceActor,
  toServiceActor,
} from "./action-execution-context.js";
import {
  createActionExecutionError,
  type AiActionExecutionError,
} from "./action-execution-errors.js";

const WRITE_CAPABILITIES = new Set([
  "create",
  "assign",
  "update",
  "draft",
  "notify",
  "schedule",
  "organize",
  "orchestrate",
  "plan",
]);

export interface AiActionServiceCallResult {
  readonly ok: boolean;
  readonly service: string | null;
  readonly summary: string;
  readonly error?: AiActionExecutionError;
}

function sanitize(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function isWriteCapability(capability: string | null): boolean {
  if (!capability) return false;
  return WRITE_CAPABILITIES.has(capability.toLowerCase());
}

function missingActor(service: string): AiActionServiceCallResult {
  return {
    ok: false,
    service,
    summary: "Missing actor",
    error: createActionExecutionError(
      "missing_user",
      `User required for ${service}`,
      { retryable: false },
    ),
  };
}

async function executeCrm(): Promise<AiActionServiceCallResult> {
  const stats = await clientsService.getStats();
  return {
    ok: true,
    service: "clientsService",
    summary: sanitize(
      `CRM summary via clientsService: ${stats.active} active / ${stats.total} total`,
    ),
  };
}

async function executeProjects(
  context: AiActionExecutionContext,
): Promise<AiActionServiceCallResult> {
  const actor = toServiceActor(context);
  if (!actor) return missingActor("projectsService");
  const stats = await projectsService.getStats(actor);
  const open = stats.inProgress + stats.notStarted + stats.onHold;
  return {
    ok: true,
    service: "projectsService",
    summary: sanitize(
      `Projects summary via projectsService: ${open} open / ${stats.completed} completed`,
    ),
  };
}

async function executeTasks(
  context: AiActionExecutionContext,
): Promise<AiActionServiceCallResult> {
  const actor = toServiceActor(context);
  if (!actor) return missingActor("tasksService");
  const stats = await tasksService.getStats(actor);
  const open = stats.todo + stats.inProgress + stats.review + stats.blocked;
  return {
    ok: true,
    service: "tasksService",
    summary: sanitize(
      `Tasks summary via tasksService: ${open} open / ${stats.overdue} overdue`,
    ),
  };
}

async function executeCalendar(
  context: AiActionExecutionContext,
): Promise<AiActionServiceCallResult> {
  const actor = toPrivilegedServiceActor(context);
  if (!actor) return missingActor("calendarService");
  const result = await calendarService.upcoming(actor);
  return {
    ok: true,
    service: "calendarService",
    summary: sanitize(
      `Calendar via calendarService: ${result.upcoming.length} upcoming / ${result.today.length} today`,
    ),
  };
}

async function executeDocuments(
  context: AiActionExecutionContext,
): Promise<AiActionServiceCallResult> {
  const actor = toServiceActor(context);
  if (!actor) return missingActor("aiService");
  const result = await aiService.listDocuments(
    { search: "", page: 1, limit: 1 },
    actor,
  );
  return {
    ok: true,
    service: "aiService",
    summary: sanitize(
      `Documents via aiService: ${result.pagination.total} document(s)`,
    ),
  };
}

async function executeReports(
  context: AiActionExecutionContext,
): Promise<AiActionServiceCallResult> {
  const actor = toPrivilegedServiceActor(context);
  if (!actor) return missingActor("reportsService");
  const result = await reportsService.listSaved(actor);
  return {
    ok: true,
    service: "reportsService",
    summary: sanitize(
      `Reports via reportsService: ${result.items.length} saved report(s)`,
    ),
  };
}

async function executeNotifications(
  context: AiActionExecutionContext,
): Promise<AiActionServiceCallResult> {
  const actor = toPrivilegedServiceActor(context);
  if (!actor) return missingActor("notificationsService");
  const result = await notificationsService.unreadCount(actor);
  return {
    ok: true,
    service: "notificationsService",
    summary: sanitize(
      `Notifications via notificationsService: ${result.count} unread`,
    ),
  };
}

async function executeFinance(
  context: AiActionExecutionContext,
): Promise<AiActionServiceCallResult> {
  const actor = toServiceActor(context);
  if (!actor) return missingActor("invoicesService");
  const stats = await invoicesService.getStats(actor);
  return {
    ok: true,
    service: "invoicesService",
    summary: sanitize(
      `Finance via invoicesService: ${stats.pending + stats.overdue + stats.sent} open / ${stats.paid} paid`,
    ),
  };
}

async function executeHr(
  context: AiActionExecutionContext,
  input?: Readonly<Record<string, unknown>>,
): Promise<AiActionServiceCallResult> {
  const actor = toPrivilegedServiceActor(context);
  if (!actor) return missingActor("teamService");

  const teamActor = {
    userId: actor.userId,
    role: actor.role,
    email: actor.email,
    permissions: actor.permissions,
  };

  const action =
    (typeof input?.action === "string" ? input.action : undefined) ??
    (typeof input?.hrAction === "string" ? input.hrAction : undefined);
  const prompt = (context.prompt ?? "").toLowerCase();

  if (
    action === "hire" ||
    action === "hire_employee" ||
    prompt.includes("hire employee")
  ) {
    const required = ["firstName", "lastName", "email", "departmentId"] as const;
    const missing = required.filter(
      (key) =>
        typeof input?.[key] !== "string" ||
        !(input[key] as string).trim(),
    );
    if (missing.length > 0) {
      return {
        ok: false,
        service: "teamService",
        summary: sanitize(
          `HR hire needs input: ${missing.join(", ")}`,
        ),
      };
    }
    try {
      const hireInput = hireEmployeeSchema.parse({
        firstName: String(input!.firstName).trim(),
        lastName: String(input!.lastName).trim(),
        email: String(input!.email).trim(),
        departmentId: String(input!.departmentId).trim(),
        designation:
          typeof input?.designation === "string"
            ? input.designation.trim()
            : null,
        primaryTeamId:
          typeof input?.primaryTeamId === "string"
            ? input.primaryTeamId.trim()
            : null,
      });
      const result = await teamService.hireEmployee(hireInput, teamActor);
      return {
        ok: true,
        service: "teamService",
        summary: sanitize(
          `Hired ${result.employee.employeeCode} via teamService`,
        ),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Hire employee failed";
      return {
        ok: false,
        service: "teamService",
        summary: sanitize(message, 120),
      };
    }
  }

  if (
    action === "transfer" ||
    action === "transfer_employee" ||
    prompt.includes("transfer employee")
  ) {
    const employeeId =
      typeof input?.employeeId === "string" ? input.employeeId.trim() : "";
    const effectiveDate =
      typeof input?.effectiveDate === "string"
        ? input.effectiveDate.trim()
        : "";
    if (!employeeId || !effectiveDate) {
      return {
        ok: false,
        service: "teamService",
        summary: sanitize(
          "HR transfer needs employeeId and effectiveDate",
        ),
      };
    }
    try {
      await teamService.createHrTransfer(
        employeeId,
        {
          effectiveDate,
          toDepartmentId:
            typeof input?.toDepartmentId === "string"
              ? input.toDepartmentId.trim()
              : null,
          toTeamId:
            typeof input?.toTeamId === "string" ? input.toTeamId.trim() : null,
          toManagerId:
            typeof input?.toManagerId === "string"
              ? input.toManagerId.trim()
              : null,
          reason:
            typeof input?.reason === "string" ? input.reason.trim() : null,
        },
        teamActor,
      );
      return {
        ok: true,
        service: "teamService",
        summary: sanitize("Employee transfer recorded via teamService"),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Transfer employee failed";
      return {
        ok: false,
        service: "teamService",
        summary: sanitize(message, 120),
      };
    }
  }

  const result = await teamService.listEmployees(
    { search: "", page: 1, limit: 1 },
    teamActor,
  );
  return {
    ok: true,
    service: "teamService",
    summary: sanitize(
      `HR via teamService: ${result.pagination.total} team member(s)`,
    ),
  };
}

async function executeStorage(
  context: AiActionExecutionContext,
): Promise<AiActionServiceCallResult> {
  const actor = toPrivilegedServiceActor(context);
  if (!actor) return missingActor("filesService");
  const result = await filesService.listFiles(
    {
      search: "",
      view: "all",
      sortBy: "updatedAt",
      sortOrder: "desc",
      page: 1,
      limit: 1,
    },
    actor,
  );
  return {
    ok: true,
    service: "filesService",
    summary: sanitize(
      `Storage via filesService: ${result.pagination.total} file(s)`,
    ),
  };
}

async function executeSettings(
  context: AiActionExecutionContext,
): Promise<AiActionServiceCallResult> {
  const actor = toPrivilegedServiceActor(context);
  if (!actor) return missingActor("settingsService");
  await settingsService.getOverview(actor);
  return {
    ok: true,
    service: "settingsService",
    summary: sanitize("Settings overview via settingsService"),
  };
}

/**
 * Domain service dispatch — CRM/Projects/Tasks/Calendar/Documents/Reports/
 * Notifications/Finance/HR/Storage/Settings via existing services only.
 */
export async function executeDomainService(
  category: AiActionCategory,
  context: AiActionExecutionContext,
): Promise<AiActionServiceCallResult> {
  switch (category) {
    case "crm":
    case "email":
      return executeCrm();
    case "project":
      return executeProjects(context);
    case "task":
      return executeTasks(context);
    case "calendar":
      return executeCalendar(context);
    case "document":
    case "workflow":
      return executeDocuments(context);
    case "report":
      return executeReports(context);
    case "notification":
      return executeNotifications(context);
    case "storage":
      return executeStorage(context);
    case "settings":
      return executeSettings(context);
    case "generic":
      return {
        ok: true,
        service: null,
        summary: sanitize("Generic action — no service call required"),
      };
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

/**
 * Optional finance/HR service helpers for extended domains (same service layer).
 */
export async function executeFinanceService(
  context: AiActionExecutionContext,
): Promise<AiActionServiceCallResult> {
  return executeFinance(context);
}

export async function executeHrService(
  context: AiActionExecutionContext,
  input?: Readonly<Record<string, unknown>>,
): Promise<AiActionServiceCallResult> {
  return executeHr(context, input);
}

/**
 * Execute a single planned step through the existing service layer.
 */
export async function executeActionStep(input: {
  readonly step: AiActionStep;
  readonly category: AiActionCategory;
  readonly context: AiActionExecutionContext;
  readonly approvalBlocksWrites: boolean;
}): Promise<AiActionServiceCallResult> {
  const { step, category, context } = input;

  if (step.id === "step.prepare" || step.id === "step.verify") {
    return {
      ok: true,
      service: null,
      summary: sanitize(`Metadata step completed: ${step.name}`),
    };
  }

  if (step.id === "step.approve") {
    return {
      ok: false,
      service: null,
      summary: sanitize("Approval gate — awaiting human approval"),
      error: createActionExecutionError(
        "approval_required",
        "Approval step blocks execution until cleared",
        { stepId: step.id, retryable: false },
      ),
    };
  }

  if (isWriteCapability(step.capability)) {
    return {
      ok: false,
      service: null,
      summary: sanitize(
        `Write capability '${step.capability}' blocked — service writes require approval`,
      ),
      error: createActionExecutionError(
        input.approvalBlocksWrites ? "approval_required" : "write_blocked",
        `Mutating capability '${step.capability ?? "unknown"}' is not auto-executed`,
        { stepId: step.id, retryable: false },
      ),
    };
  }

  if (
    category === "generic" ||
    step.capability === "clarify" ||
    step.capability === "assist"
  ) {
    return {
      ok: true,
      service: null,
      summary: sanitize(`Assist step completed: ${step.name}`),
    };
  }

  try {
    return await executeDomainService(category, context);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Service call failed";
    return {
      ok: false,
      service: "unknown",
      summary: sanitize(`Service error for ${step.name}`),
      error: createActionExecutionError("service_error", sanitize(message, 120), {
        stepId: step.id,
        retryable: true,
      }),
    };
  }
}
