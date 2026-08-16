import { prisma } from "@enterprise/database";
import {
  PERMISSIONS,
  UserRole,
  type PermissionSubject,
} from "@enterprise/shared";

import type {
  AiActiveContext,
  AiContextEntityRef,
  AiContextSnippet,
} from "../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";
import { permissionService } from "../../../../shared/services/permission.service.js";
import {
  projectsRepository,
  type ProjectAccessScope,
} from "../../../projects/projects.repository.js";
import {
  tasksRepository,
  type TaskAccessScope,
} from "../../../tasks/tasks.repository.js";
import { customerRequestsService } from "../../../customer-requests/customer-requests.service.js";
import { invoicesService } from "../../../invoices/invoices.service.js";
import { paymentsService } from "../../../payments/payments.service.js";
import { quotesService } from "../../../quotes/quotes.service.js";

const MAX_ENTITIES = 3;
const MAX_SUMMARY_CHARS = 220;

export interface ResolveBusinessContextInput {
  readonly userId?: string | null;
  readonly role?: string | null;
  readonly permissions?: readonly string[];
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
}

function truncate(text: string, max = MAX_SUMMARY_CHARS): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 3)}...`;
}

function normalizeType(type: string): string {
  return type.trim().toLowerCase();
}

function requiredPermission(type: string): string | null {
  switch (normalizeType(type)) {
    case "client":
    case "clients":
      return PERMISSIONS.CLIENTS_READ;
    case "project":
    case "projects":
      return PERMISSIONS.PROJECTS_READ;
    case "task":
    case "tasks":
      return PERMISSIONS.TASKS_READ;
    case "report":
    case "reports":
      return PERMISSIONS.REPORTS_READ;
    case "document":
    case "ai_document":
      return PERMISSIONS.AI_USE;
    case "request":
    case "customer_request":
      return PERMISSIONS.CUSTOMER_REQUESTS_READ;
    case "quote":
    case "quotes":
      return PERMISSIONS.QUOTES_READ;
    case "payment":
    case "payments":
      return PERMISSIONS.PAYMENTS_READ;
    case "invoice":
    case "invoices":
      return PERMISSIONS.INVOICES_READ;
    default:
      return null;
  }
}

async function resolveProjectScope(
  userId: string,
  role: string,
): Promise<ProjectAccessScope> {
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
  return { all: false };
}

async function resolveTaskScope(
  userId: string,
  role: string,
): Promise<TaskAccessScope> {
  if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) {
    return { all: true };
  }
  if (role === UserRole.EMPLOYEE) {
    return { all: false, assignedUserId: userId };
  }
  if (role === UserRole.CLIENT) {
    const companyId = await projectsRepository.getUserCompanyId(userId);
    return { all: false, clientCompanyId: companyId };
  }
  return { all: false };
}

async function summarizeClient(
  ref: AiContextEntityRef,
): Promise<AiContextSnippet | null> {
  const client = await prisma.client.findFirst({
    where: { id: ref.id, deletedAt: null },
    select: {
      companyName: true,
      status: true,
      city: true,
      country: true,
    },
  });
  if (!client) return null;

  const location = [client.city, client.country].filter(Boolean).join(", ");
  const text = truncate(
    [
      `Client: ${client.companyName}`,
      `Status: ${client.status}`,
      location ? `Location: ${location}` : null,
    ]
      .filter(Boolean)
      .join(" | "),
  );

  return {
    type: "client",
    title: client.companyName,
    text,
    sourcePermission: PERMISSIONS.CLIENTS_READ,
  };
}

async function summarizeProject(
  ref: AiContextEntityRef,
  scope: ProjectAccessScope,
): Promise<AiContextSnippet | null> {
  const project = await projectsRepository.findById(ref.id, scope);
  if (!project) return null;

  const description = project.description
    ? truncate(project.description, 120)
    : null;
  const text = truncate(
    [
      `Project: ${project.name}`,
      `Status: ${project.status}`,
      `Priority: ${project.priority}`,
      `Progress: ${project.progress}%`,
      project.dueDate
        ? `Due: ${project.dueDate.toISOString().slice(0, 10)}`
        : null,
      description ? `Summary: ${description}` : null,
    ]
      .filter(Boolean)
      .join(" | "),
  );

  return {
    type: "project",
    title: project.name,
    text,
    sourcePermission: PERMISSIONS.PROJECTS_READ,
  };
}

async function summarizeTask(
  ref: AiContextEntityRef,
  scope: TaskAccessScope,
): Promise<AiContextSnippet | null> {
  const task = await tasksRepository.findById(ref.id, scope);
  if (!task) return null;

  const text = truncate(
    [
      `Task: ${task.title}`,
      `Status: ${task.status}`,
      `Priority: ${task.priority}`,
      `Progress: ${task.progress}%`,
      task.dueDate ? `Due: ${task.dueDate.toISOString().slice(0, 10)}` : null,
    ]
      .filter(Boolean)
      .join(" | "),
  );

  return {
    type: "task",
    title: task.title,
    text,
    sourcePermission: PERMISSIONS.TASKS_READ,
  };
}

async function summarizeRequest(
  ref: AiContextEntityRef,
  actor: {
    userId: string;
    role: string;
    email: string;
  },
): Promise<AiContextSnippet | null> {
  const request = await customerRequestsService.getById(ref.id, actor);
  const text = truncate(
    [
      `Request: ${request.title}`,
      `Status: ${request.status}`,
      `Type: ${request.type}`,
      request.agreedAmount != null
        ? `Agreed: ${request.agreedAmount} ${request.currency}`
        : null,
    ]
      .filter(Boolean)
      .join(" | "),
  );
  return {
    type: "request",
    title: request.title,
    text,
    sourcePermission: PERMISSIONS.CUSTOMER_REQUESTS_READ,
  };
}

async function summarizeQuote(
  ref: AiContextEntityRef,
  actor: {
    userId: string;
    role: string;
    email: string;
  },
): Promise<AiContextSnippet | null> {
  const quote = await quotesService.getById(ref.id, actor);
  const text = truncate(
    [
      `Quote: ${quote.quoteNumber}`,
      `Status: ${quote.status}`,
      `Deal: ${quote.dealAmount} ${quote.currency}`,
      `Advance: ${quote.advanceRequired}`,
      `Paid: ${quote.paidAmount}`,
      `Remaining: ${quote.remainingAmount}`,
      `Workspace: ${quote.workspaceUnlocked ? "unlocked" : "locked"}`,
    ].join(" | "),
  );
  return {
    type: "quote",
    title: quote.quoteNumber,
    text,
    sourcePermission: PERMISSIONS.QUOTES_READ,
  };
}

async function summarizePayment(
  ref: AiContextEntityRef,
  actor: {
    userId: string;
    role: string;
    email: string;
  },
): Promise<AiContextSnippet | null> {
  const payment = await paymentsService.getById(ref.id, actor);
  const text = truncate(
    [
      `Payment: ${payment.paymentNumber}`,
      `Status: ${payment.status}`,
      `Amount: ${payment.amount} ${payment.currency}`,
      `Method: ${payment.method}`,
      payment.customerReference
        ? `Reference: ${payment.customerReference}`
        : null,
    ]
      .filter(Boolean)
      .join(" | "),
  );
  return {
    type: "payment",
    title: payment.paymentNumber,
    text,
    sourcePermission: PERMISSIONS.PAYMENTS_READ,
  };
}

async function summarizeInvoice(
  ref: AiContextEntityRef,
  actor: {
    userId: string;
    role: string;
    email: string;
  },
): Promise<AiContextSnippet | null> {
  const invoice = await invoicesService.getById(ref.id, actor);
  const text = truncate(
    [
      `Invoice: ${invoice.invoiceNumber}`,
      `Status: ${invoice.status}`,
      `Payment: ${invoice.paymentStatus}`,
      `Total: ${invoice.total} ${invoice.currency}`,
      `Paid: ${invoice.paidAmount}`,
    ].join(" | "),
  );
  return {
    type: "invoice",
    title: invoice.invoiceNumber,
    text,
    sourcePermission: PERMISSIONS.INVOICES_READ,
  };
}

async function summarizeAiDocument(
  ref: AiContextEntityRef,
  userId: string,
): Promise<AiContextSnippet | null> {
  const doc = await prisma.aiDocument.findFirst({
    where: { id: ref.id, userId, deletedAt: null },
    select: { title: true, type: true },
  });
  if (!doc) return null;

  const text = truncate(`AI Document: ${doc.title} | Type: ${doc.type}`);
  return {
    type: "document",
    title: doc.title,
    text,
    sourcePermission: PERMISSIONS.AI_USE,
  };
}

/**
 * Resolve lightweight, permission-approved business summaries for active entity refs.
 * No raw records, no unrelated module queries, no tool execution.
 */
export async function resolveBusinessContextSnippets(
  input: ResolveBusinessContextInput,
): Promise<readonly AiContextSnippet[]> {
  const userId = input.userId?.trim();
  if (!userId) return [];

  if (input.policy.privacyMode) return [];

  const refs = input.activeContext.entities.slice(0, MAX_ENTITIES);
  if (refs.length === 0) return [];

  const role = input.role ?? input.activeContext.user?.role ?? "EMPLOYEE";
  const permissions = input.permissions ? [...input.permissions] : [];
  const subject: PermissionSubject = { role, permissions };

  // If permissions were not provided, skip business payloads (fail closed).
  // Context Engine / Tool Eligibility already load keys when needed; callers should pass them.
  if (permissions.length === 0) {
    const loaded = await prisma.user.findFirst({
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
    subject.permissions =
      loaded?.role.rolePermissions.map((rp) => rp.permission.key) ?? [];
  }

  if (subject.permissions.length === 0 && role !== UserRole.SUPER_ADMIN) {
    return [];
  }

  const projectScope = await resolveProjectScope(userId, role);
  const taskScope = await resolveTaskScope(userId, role);
  const commercialActor = {
    userId,
    role,
    email: input.activeContext.user?.email?.trim() || "unknown@eliteflow.local",
  };
  const snippets: AiContextSnippet[] = [];

  for (const ref of refs) {
    const permission = requiredPermission(ref.type);
    if (!permission) continue;
    if (!permissionService.hasPermission(subject, permission)) continue;

    try {
      let snippet: AiContextSnippet | null = null;
      const type = normalizeType(ref.type);

      if (type === "client" || type === "clients") {
        snippet = await summarizeClient(ref);
      } else if (type === "project" || type === "projects") {
        snippet = await summarizeProject(ref, projectScope);
      } else if (type === "task" || type === "tasks") {
        snippet = await summarizeTask(ref, taskScope);
      } else if (type === "document" || type === "ai_document") {
        snippet = await summarizeAiDocument(ref, userId);
      } else if (type === "request" || type === "customer_request") {
        snippet = await summarizeRequest(ref, commercialActor);
      } else if (type === "quote" || type === "quotes") {
        snippet = await summarizeQuote(ref, commercialActor);
      } else if (type === "payment" || type === "payments") {
        snippet = await summarizePayment(ref, commercialActor);
      } else if (type === "invoice" || type === "invoices") {
        snippet = await summarizeInvoice(ref, commercialActor);
      } else if (type === "report" || type === "reports") {
        // No single report-record summary API yet — skip rather than over-fetch analytics.
        continue;
      }

      if (snippet) snippets.push(snippet);
    } catch {
      // Fail closed per entity — never break the chat pipeline.
    }
  }

  return snippets;
}

export function formatBusinessContextForRuntime(
  snippets: readonly AiContextSnippet[],
): string {
  if (snippets.length === 0) return "";

  const lines = ["Business context (permission-approved summaries):"];
  for (const snippet of snippets) {
    lines.push(`- [${snippet.type}] ${snippet.text}`);
  }
  return lines.join("\n");
}
