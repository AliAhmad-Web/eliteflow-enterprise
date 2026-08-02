/**
 * Real enterprise tool runners.
 * Use existing repositories/services. Guarded by RBAC / privacy / context.
 */

import { UserRole } from "@enterprise/shared";

import { aiRepository } from "../../ai.repository.js";
import { calendarRepository } from "../../../calendar/calendar.repository.js";
import { clientsRepository } from "../../../clients/clients.repository.js";
import {
  projectsRepository,
  type ProjectAccessScope,
} from "../../../projects/projects.repository.js";
import { tasksRepository } from "../../../tasks/tasks.repository.js";
import type { AiToolId } from "../contracts/ai-tool-execution.js";
import { AI_TOOL_CATALOG } from "./tool-catalog.js";
import {
  assertToolExecutionAllowed,
  ToolExecutionGuardError,
} from "./tool-execution-guard.js";
import type { AiToolExecutionContext } from "./tool-execution-context.js";

function findDefinition(toolId: AiToolId) {
  return AI_TOOL_CATALOG.find((item) => item.id === toolId) ?? null;
}

function stringField(
  input: Readonly<Record<string, unknown>> | undefined,
  key: string,
): string | undefined {
  const value = input?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function entityIdByType(
  context: AiToolExecutionContext,
  types: string[],
): string | null {
  const wanted = new Set(types.map((t) => t.toLowerCase()));
  const primary = context.activeContext.primaryEntity;
  if (primary && wanted.has(primary.type.toLowerCase())) {
    return primary.id;
  }
  const match = context.activeContext.entities.find((e) =>
    wanted.has(e.type.toLowerCase()),
  );
  return match?.id ?? null;
}

async function resolveProjectScope(
  context: AiToolExecutionContext,
): Promise<ProjectAccessScope> {
  const userId = context.userId!.trim();
  const role = context.role ?? context.activeContext.user?.role ?? "EMPLOYEE";
  if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) {
    return { all: true };
  }
  if (role === UserRole.EMPLOYEE) {
    return { all: false, memberUserId: userId };
  }
  if (role === UserRole.CLIENT) {
    const companyId = await projectsRepository.getUserCompanyId(userId);
    return { all: false, clientCompanyId: companyId };
  }
  return { all: false, memberUserId: userId };
}

function deriveTitle(prompt: string | null | undefined, fallback: string): string {
  const cleaned = (prompt ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  return cleaned.length > 80 ? `${cleaned.slice(0, 77)}...` : cleaned;
}

function localSummary(text: string, maxSentences = 3): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length === 0) return cleaned.slice(0, 400);
  return parts.slice(0, maxSentences).join(" ").slice(0, 800);
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new Error("Tool execution aborted");
  }
}

async function runDraftEmail(
  context: AiToolExecutionContext,
  input: Readonly<Record<string, unknown>> | undefined,
  signal: AbortSignal,
): Promise<Readonly<Record<string, unknown>>> {
  throwIfAborted(signal);
  const prompt = context.prompt ?? "";
  const subject =
    stringField(input, "subject") ??
    `Follow-up: ${deriveTitle(prompt, "EliteFlow update")}`;
  const body =
    stringField(input, "body") ??
    [
      "Hello,",
      "",
      prompt.trim() || "Please find the update below.",
      "",
      "Best regards",
    ].join("\n");

  return {
    kind: "email_draft",
    subject,
    body,
    to: stringField(input, "to") ?? null,
    mode: context.mode ?? null,
  };
}

async function runSaveAiDocument(
  context: AiToolExecutionContext,
  input: Readonly<Record<string, unknown>> | undefined,
  signal: AbortSignal,
): Promise<Readonly<Record<string, unknown>>> {
  throwIfAborted(signal);
  const userId = context.userId!.trim();
  const prompt = (context.prompt?.trim() || stringField(input, "prompt") || "");
  const content =
    stringField(input, "content") ??
    (prompt || "Generated document content");
  const title =
    stringField(input, "title") ?? deriveTitle(prompt, "AI Document");

  const created = await aiRepository.createDocument({
    userId,
    title,
    type: "GENERAL" as const,
    prompt: prompt || title,
    content,
  });

  throwIfAborted(signal);
  return {
    kind: "ai_document",
    id: created.id,
    title: created.title,
    type: created.type,
  };
}

async function runSummarizeContent(
  context: AiToolExecutionContext,
  input: Readonly<Record<string, unknown>> | undefined,
  signal: AbortSignal,
): Promise<Readonly<Record<string, unknown>>> {
  throwIfAborted(signal);
  const source =
    stringField(input, "content") ??
    context.activeContext.ambientText ??
    context.prompt ??
    "";
  const summary = localSummary(source);
  if (!summary) {
    throw new Error("No content available to summarize");
  }
  return {
    kind: "summary",
    summary,
    sourceLength: source.length,
  };
}

async function runCreateTask(
  context: AiToolExecutionContext,
  input: Readonly<Record<string, unknown>> | undefined,
  signal: AbortSignal,
): Promise<Readonly<Record<string, unknown>>> {
  throwIfAborted(signal);
  const userId = context.userId!.trim();
  const title =
    stringField(input, "title") ??
    deriveTitle(context.prompt, "AI-created task");
  const projectId =
    stringField(input, "projectId") ??
    entityIdByType(context, ["project", "projects"]) ??
    "";
  const assignedToId =
    stringField(input, "assignedToId") ?? userId;

  const created = await tasksRepository.create(
    {
      title,
      description: stringField(input, "description") ?? context.prompt ?? "",
      projectId,
      assignedToId,
      status: "TODO",
      priority: "MEDIUM",
      labels: [],
      startDate: "",
      dueDate: stringField(input, "dueDate") ?? "",
      progress: 0,
      estimatedHours: "",
      attachments: [],
    },
    userId,
  );

  throwIfAborted(signal);
  return {
    kind: "task",
    id: created.id,
    title: created.title,
    projectId: created.projectId,
    assignedToId: created.assignedToId,
  };
}

async function runCreateCalendarEvent(
  context: AiToolExecutionContext,
  input: Readonly<Record<string, unknown>> | undefined,
  signal: AbortSignal,
): Promise<Readonly<Record<string, unknown>>> {
  throwIfAborted(signal);
  const userId = context.userId!.trim();
  const title =
    stringField(input, "title") ??
    deriveTitle(context.prompt, "AI calendar event");

  const startsAtRaw = stringField(input, "startsAt");
  const endsAtRaw = stringField(input, "endsAt");
  const startsAt = startsAtRaw ? new Date(startsAtRaw) : new Date();
  const endsAt = endsAtRaw
    ? new Date(endsAtRaw)
    : new Date(startsAt.getTime() + 60 * 60 * 1000);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error("Invalid startsAt/endsAt for calendar event");
  }

  const projectId =
    stringField(input, "projectId") ??
    entityIdByType(context, ["project", "projects"]);
  const clientId =
    stringField(input, "clientId") ??
    entityIdByType(context, ["client", "clients"]);

  const created = await calendarRepository.createEvent({
    title,
    description: stringField(input, "description") ?? context.prompt ?? null,
    notes: null,
    location: stringField(input, "location") ?? null,
    type: "MEETING",
    status: "CONFIRMED",
    category: "WORK",
    color: stringField(input, "color") ?? "#2563eb",
    startsAt,
    endsAt,
    allDay: false,
    isPrivate: false,
    recurrenceFrequency: "NONE",
    recurrenceInterval: 1,
    recurrenceUntil: null,
    recurrenceCount: null,
    attachmentUrls: [],
    projectId,
    taskId: null,
    clientId,
    createdById: userId,
    attendees: [{ userId, isOptional: false }],
  });

  throwIfAborted(signal);
  return {
    kind: "calendar_event",
    id: created.id,
    title: created.title,
    startsAt: created.startsAt.toISOString(),
    endsAt: created.endsAt.toISOString(),
  };
}

async function runAnalyzeProject(
  context: AiToolExecutionContext,
  input: Readonly<Record<string, unknown>> | undefined,
  signal: AbortSignal,
): Promise<Readonly<Record<string, unknown>>> {
  throwIfAborted(signal);
  const projectId =
    stringField(input, "projectId") ??
    entityIdByType(context, ["project", "projects"]);
  if (!projectId) {
    throw new Error("No project entity in active context for analyze_project");
  }

  const scope = await resolveProjectScope(context);
  const project = await projectsRepository.findById(projectId, scope);
  throwIfAborted(signal);

  if (!project) {
    throw new Error("Project not found or not accessible in organization scope");
  }

  return {
    kind: "project_analysis",
    id: project.id,
    name: project.name,
    status: project.status,
    priority: project.priority,
    progress: project.progress,
    dueDate: project.dueDate?.toISOString?.() ?? project.dueDate ?? null,
    summary: localSummary(
      `${project.name}. ${project.description ?? ""} Status ${project.status}, progress ${project.progress}%.`,
    ),
  };
}

async function runAnalyzeReport(
  context: AiToolExecutionContext,
  input: Readonly<Record<string, unknown>> | undefined,
  signal: AbortSignal,
): Promise<Readonly<Record<string, unknown>>> {
  throwIfAborted(signal);
  const reportId =
    stringField(input, "reportId") ??
    entityIdByType(context, ["report", "reports"]);

  // Reports module varies; provide structured analysis from prompt/context when no id.
  const source =
    stringField(input, "content") ??
    context.prompt ??
    context.activeContext.ambientText ??
    "";

  throwIfAborted(signal);
  return {
    kind: "report_analysis",
    reportId: reportId ?? null,
    findings: localSummary(source || "No report content provided."),
    risks: [],
    recommendations: source
      ? ["Review highlighted findings with stakeholders."]
      : ["Provide a report entity or content for deeper analysis."],
  };
}

async function runLookupClient(
  context: AiToolExecutionContext,
  input: Readonly<Record<string, unknown>> | undefined,
  signal: AbortSignal,
): Promise<Readonly<Record<string, unknown>>> {
  throwIfAborted(signal);
  const clientId =
    stringField(input, "clientId") ??
    entityIdByType(context, ["client", "clients"]);
  if (!clientId) {
    throw new Error("No client entity in active context for lookup_client");
  }

  const client = await clientsRepository.findById(clientId);
  throwIfAborted(signal);
  if (!client) {
    throw new Error("Client not found");
  }

  // Organization boundary: when org present and client has company linkage via user company,
  // we rely on prior permission gating (CLIENTS_READ) + entity filter from context engine.
  return {
    kind: "client_lookup",
    id: client.id,
    companyName: client.companyName,
    contactName: client.contactName,
    email: client.email,
    status: client.status,
    city: client.city,
    country: client.country,
  };
}

type RealRunner = (
  context: AiToolExecutionContext,
  input: Readonly<Record<string, unknown>> | undefined,
  signal: AbortSignal,
) => Promise<Readonly<Record<string, unknown>>>;

const REAL_RUNNERS: Readonly<Record<string, RealRunner>> = {
  draft_email: runDraftEmail,
  save_ai_document: runSaveAiDocument,
  summarize_content: runSummarizeContent,
  create_task: runCreateTask,
  create_calendar_event: runCreateCalendarEvent,
  analyze_project: runAnalyzeProject,
  analyze_report: runAnalyzeReport,
  lookup_client: runLookupClient,
};

/**
 * Execute a catalog tool with real enterprise side effects / lookups.
 */
export async function runRealTool(
  toolId: AiToolId,
  context: AiToolExecutionContext,
  input: Readonly<Record<string, unknown>> | undefined,
  signal: AbortSignal,
): Promise<Readonly<Record<string, unknown>>> {
  const definition = findDefinition(toolId);
  if (!definition) {
    throw new ToolExecutionGuardError(
      `Unknown tool '${toolId}'`,
      "UNKNOWN_TOOL",
    );
  }

  assertToolExecutionAllowed(definition, context);

  const runner = REAL_RUNNERS[toolId];
  if (!runner) {
    throw new ToolExecutionGuardError(
      `No real runner registered for '${toolId}'`,
      "NO_RUNNER",
    );
  }

  return runner(context, input, signal);
}
