/**
 * Read-only customer portal lookups. Calls existing scoped services only.
 */

import { PERMISSIONS, UserRole } from "@enterprise/shared";
import {
  listCustomerRequestsQuerySchema,
  listInvoicesQuerySchema,
  listPaymentsQuerySchema,
  listProjectsQuerySchema,
  listQuotesQuerySchema,
} from "@enterprise/shared";

import { customerRequestsService } from "../../../customer-requests/customer-requests.service.js";
import { invoicesService } from "../../../invoices/invoices.service.js";
import { paymentsService } from "../../../payments/payments.service.js";
import { projectsService } from "../../../projects/projects.service.js";
import { quotesService } from "../../../quotes/quotes.service.js";
import type { AiToolExecutionContext } from "./tool-execution-context.js";
import { ToolExecutionGuardError } from "./tool-execution-guard.js";

function requireCustomerContext(
  context: AiToolExecutionContext,
): {
  userId: string;
  role: string;
  email: string;
  permissions: string[];
} {
  if (context.activeContext.surface !== "CUSTOMER") {
    throw new ToolExecutionGuardError(
      "Customer tools are only available on the customer AI surface",
      "FORBIDDEN",
    );
  }

  const userId = context.userId?.trim();
  if (!userId) {
    throw new ToolExecutionGuardError(
      "Authenticated user required",
      "UNAUTHENTICATED",
    );
  }

  const role = context.role ?? context.activeContext.user?.role ?? "";
  if (String(role).toUpperCase() !== UserRole.CLIENT) {
    throw new ToolExecutionGuardError(
      "Customer tools are limited to client portal users",
      "FORBIDDEN",
    );
  }

  return {
    userId,
    role,
    email: context.activeContext.user?.email?.trim() ?? "unknown@eliteflow.local",
    permissions: [...(context.permissions ?? [])],
  };
}

function hasPermission(
  permissions: readonly string[],
  key: string,
): boolean {
  return permissions.includes(key);
}

function stringField(
  input: Readonly<Record<string, unknown>> | undefined,
  key: string,
): string | undefined {
  const value = input?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function sanitizeRequest(item: {
  id: string;
  title: string;
  status: string;
  type: string;
  agreedAmount: number | null;
  commercialAmount: number | null;
  currency: string;
}) {
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    type: item.type,
    agreedAmount: item.agreedAmount,
    commercialAmount: item.commercialAmount,
    currency: item.currency,
  };
}

function sanitizeQuote(item: {
  id: string;
  quoteNumber: string;
  status: string;
  dealAmount: number;
  advanceRequired: number;
  paidAmount: number;
  remainingAmount: number;
  overallPaymentStatus: string;
  commercialStage: string | null;
  workspaceUnlocked: boolean;
  currency: string;
}) {
  return {
    id: item.id,
    quoteNumber: item.quoteNumber,
    status: item.status,
    dealAmount: item.dealAmount,
    advanceRequired: item.advanceRequired,
    paidAmount: item.paidAmount,
    remainingAmount: item.remainingAmount,
    overallPaymentStatus: item.overallPaymentStatus,
    commercialStage: item.commercialStage,
    workspaceUnlocked: item.workspaceUnlocked,
    currency: item.currency,
  };
}

function sanitizePayment(item: {
  id: string;
  paymentNumber: string;
  status: string;
  method: string;
  amount: number;
  currency: string;
  customerReference: string | null;
  providerTxnId: string | null;
  invoiceNumber: string | null;
  invoicePaymentStatus?: string | null;
}) {
  return {
    id: item.id,
    paymentNumber: item.paymentNumber,
    status: item.status,
    method: item.method,
    amount: item.amount,
    currency: item.currency,
    customerReference: item.customerReference,
    providerTxnId: item.providerTxnId,
    invoiceNumber: item.invoiceNumber,
    invoicePaymentStatus: item.invoicePaymentStatus ?? null,
  };
}

function sanitizeInvoice(item: {
  id: string;
  invoiceNumber: string;
  status: string;
  paymentStatus?: string;
  total: number;
  paidAmount?: number;
  remainingAmount?: number;
  currency: string;
}) {
  return {
    id: item.id,
    invoiceNumber: item.invoiceNumber,
    status: item.status,
    paymentStatus: item.paymentStatus ?? "UNKNOWN",
    total: item.total,
    paidAmount: item.paidAmount ?? 0,
    remainingAmount: item.remainingAmount ?? null,
    currency: item.currency,
  };
}

function sanitizeProject(item: {
  id: string;
  name: string;
  status: string;
  progress: number;
}) {
  return {
    id: item.id,
    name: item.name,
    status: item.status,
    progress: item.progress,
  };
}

export async function runCustomerPortalStatus(
  context: AiToolExecutionContext,
  input: Readonly<Record<string, unknown>> | undefined,
  signal: AbortSignal,
): Promise<Readonly<Record<string, unknown>>> {
  if (signal.aborted) {
    throw new Error("Tool execution aborted");
  }

  const actor = requireCustomerContext(context);
  const entityType = stringField(input, "entityType")?.toLowerCase();
  const entityId = stringField(input, "entityId");

  try {
    if (entityType && entityId) {
      if (entityType === "request" && hasPermission(actor.permissions, PERMISSIONS.CUSTOMER_REQUESTS_READ)) {
        const request = await customerRequestsService.getById(entityId, actor);
        return { kind: "request", item: sanitizeRequest(request) };
      }
      if (entityType === "quote" && hasPermission(actor.permissions, PERMISSIONS.QUOTES_READ)) {
        const quote = await quotesService.getById(entityId, actor);
        return { kind: "quote", item: sanitizeQuote(quote) };
      }
      if (entityType === "payment" && hasPermission(actor.permissions, PERMISSIONS.PAYMENTS_READ)) {
        const payment = await paymentsService.getById(entityId, actor);
        return { kind: "payment", item: sanitizePayment(payment) };
      }
      if (entityType === "invoice" && hasPermission(actor.permissions, PERMISSIONS.INVOICES_READ)) {
        const invoice = await invoicesService.getById(entityId, actor);
        return { kind: "invoice", item: sanitizeInvoice(invoice) };
      }
      if (entityType === "project" && hasPermission(actor.permissions, PERMISSIONS.PROJECTS_READ)) {
        const project = await projectsService.getById(entityId, actor);
        return { kind: "project", item: sanitizeProject(project) };
      }
      return {
        kind: "unavailable",
        message: "That record is not available in your portal.",
      };
    }

    const [requests, quotes, payments, invoices, projects, methods] =
      await Promise.all([
        hasPermission(actor.permissions, PERMISSIONS.CUSTOMER_REQUESTS_READ)
          ? customerRequestsService.list(
              listCustomerRequestsQuerySchema.parse({ page: 1, limit: 5 }),
              actor,
            )
          : { items: [] },
        hasPermission(actor.permissions, PERMISSIONS.QUOTES_READ)
          ? quotesService.list(
              listQuotesQuerySchema.parse({ page: 1, limit: 5 }),
              actor,
            )
          : { items: [] },
        hasPermission(actor.permissions, PERMISSIONS.PAYMENTS_READ)
          ? paymentsService.list(
              listPaymentsQuerySchema.parse({ page: 1, limit: 5 }),
              actor,
            )
          : { items: [] },
        hasPermission(actor.permissions, PERMISSIONS.INVOICES_READ)
          ? invoicesService.list(
              listInvoicesQuerySchema.parse({ page: 1, limit: 5 }),
              actor,
            )
          : { items: [] },
        hasPermission(actor.permissions, PERMISSIONS.PROJECTS_READ)
          ? projectsService.list(
              listProjectsQuerySchema.parse({ page: 1, limit: 5 }),
              actor,
            )
          : { items: [] },
        hasPermission(actor.permissions, PERMISSIONS.PAYMENTS_READ)
          ? paymentsService.listMethods()
          : [],
      ]);

    return {
      kind: "portal_snapshot",
      requests: requests.items.slice(0, 5).map(sanitizeRequest),
      quotes: quotes.items.slice(0, 5).map(sanitizeQuote),
      payments: payments.items.slice(0, 5).map(sanitizePayment),
      invoices: invoices.items.slice(0, 5).map(sanitizeInvoice),
      projects: projects.items.slice(0, 5).map(sanitizeProject),
      paymentMethods: methods
        .filter((method) => method.enabled)
        .map((method) => ({
          method: method.method,
          displayName: method.displayName,
        })),
      nextSteps: [
        "Use /requests to submit or track work requests.",
        "Use /quotes to review and accept a quote.",
        "Use /payments to pay an invoice. Staff must verify payments before a project unlocks.",
        "Workspace and projects appear after the advance payment is verified.",
      ],
    };
  } catch {
    return {
      kind: "unavailable",
      message: "That information is not available in your portal.",
    };
  }
}
