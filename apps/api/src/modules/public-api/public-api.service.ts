import { prisma } from "@enterprise/database";
import type { PublicApiListQueryInput } from "@enterprise/shared";
import { PUBLIC_API_ERROR_CODES } from "@enterprise/shared";

import { clientsRepository } from "../clients/clients.repository.js";
import { invoicesRepository } from "../invoices/invoices.repository.js";
import { projectsRepository } from "../projects/projects.repository.js";
import { tasksRepository } from "../tasks/tasks.repository.js";
import {
  PUBLIC_API_AUDIT_ACTIONS,
  logPublicApiAuditEvent,
} from "./public-api.audit.js";
import type { PublicApiAuthContext } from "./public-api.auth.middleware.js";
import { PublicApiError } from "./public-api.errors.js";

type PublicListMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function pageMeta(page: number, pageSize: number, total: number): PublicListMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Safe public DTOs — no notes, member emails, payment actor details, secrets. */
export type PublicClientDto = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicProjectDto = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  clientId: string | null;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicTaskDto = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicInvoiceDto = {
  id: string;
  invoiceNumber: string;
  status: string;
  clientId: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  issueDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

function assertNoClientBypass(
  ctx: PublicApiAuthContext,
  requestedClientId: string | undefined | null,
): void {
  if (
    requestedClientId &&
    ctx.clientId &&
    requestedClientId !== ctx.clientId
  ) {
    throw new PublicApiError(
      "Resource not found",
      404,
      PUBLIC_API_ERROR_CODES.NOT_FOUND,
    );
  }
}

export class PublicApiService {
  async getMe(ctx: PublicApiAuthContext, audit: AuditCtx) {
    await logPublicApiAuditEvent({
      userId: ctx.ownerUserId,
      action: PUBLIC_API_AUDIT_ACTIONS.READ_ME,
      resourceId: ctx.keyId,
      metadata: { keyPrefix: ctx.keyPrefix, clientId: ctx.clientId },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });

    let companyName: string | null = null;
    if (ctx.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: ctx.clientId, deletedAt: null },
        select: { companyName: true },
      });
      companyName = client?.companyName ?? null;
    }

    return {
      keyId: ctx.keyId,
      keyPrefix: ctx.keyPrefix,
      scopes: ctx.scopes,
      companyId: ctx.clientId,
      companyName,
      ownerUserId: ctx.ownerUserId,
    };
  }

  async listClients(
    ctx: PublicApiAuthContext,
    query: PublicApiListQueryInput,
    audit: AuditCtx,
  ): Promise<{ items: PublicClientDto[]; meta: PublicListMeta }> {
    if (ctx.clientId) {
      const client = await clientsRepository.findById(ctx.clientId);
      const items = client ? [toPublicClient(client)] : [];
      await this.auditRead(ctx, PUBLIC_API_AUDIT_ACTIONS.READ_CLIENTS, audit, {
        count: items.length,
      });
      return { items, meta: pageMeta(1, query.pageSize, items.length) };
    }

    const result = await clientsRepository.findMany({
      page: query.page,
      limit: query.pageSize,
      search: query.search ?? "",
      sortBy: "createdAt",
      sortOrder: query.sortOrder,
    });

    await this.auditRead(ctx, PUBLIC_API_AUDIT_ACTIONS.READ_CLIENTS, audit, {
      count: result.items.length,
    });

    return {
      items: result.items.map(toPublicClient),
      meta: pageMeta(query.page, query.pageSize, result.total),
    };
  }

  async getClient(
    ctx: PublicApiAuthContext,
    id: string,
    audit: AuditCtx,
  ): Promise<PublicClientDto> {
    assertNoClientBypass(ctx, id);
    if (ctx.clientId && ctx.clientId !== id) {
      throw new PublicApiError(
        "Resource not found",
        404,
        PUBLIC_API_ERROR_CODES.NOT_FOUND,
      );
    }

    const client = await clientsRepository.findById(id);
    if (!client) {
      throw new PublicApiError(
        "Resource not found",
        404,
        PUBLIC_API_ERROR_CODES.NOT_FOUND,
      );
    }

    await this.auditRead(ctx, PUBLIC_API_AUDIT_ACTIONS.READ_CLIENT, audit, {
      resourceId: id,
    });
    return toPublicClient(client);
  }

  async listProjects(
    ctx: PublicApiAuthContext,
    query: PublicApiListQueryInput,
    audit: AuditCtx,
  ) {
    const scope = this.projectScope(ctx);
    const result = await projectsRepository.findMany(
      {
        page: query.page,
        limit: query.pageSize,
        search: query.search ?? "",
        sortBy: "createdAt",
        sortOrder: query.sortOrder,
      },
      scope,
    );
    await this.auditRead(ctx, PUBLIC_API_AUDIT_ACTIONS.READ_PROJECTS, audit, {
      count: result.items.length,
    });
    return {
      items: result.items.map(toPublicProject),
      meta: pageMeta(query.page, query.pageSize, result.total),
    };
  }

  async getProject(ctx: PublicApiAuthContext, id: string, audit: AuditCtx) {
    const project = await projectsRepository.findById(id, this.projectScope(ctx));
    if (!project) {
      throw new PublicApiError(
        "Resource not found",
        404,
        PUBLIC_API_ERROR_CODES.NOT_FOUND,
      );
    }
    await this.auditRead(ctx, PUBLIC_API_AUDIT_ACTIONS.READ_PROJECT, audit, {
      resourceId: id,
    });
    return toPublicProject(project);
  }

  async listTasks(
    ctx: PublicApiAuthContext,
    query: PublicApiListQueryInput,
    audit: AuditCtx,
  ) {
    const scope = this.taskScope(ctx);
    const result = await tasksRepository.findMany(
      {
        page: query.page,
        limit: query.pageSize,
        search: query.search ?? "",
        sortBy: "createdAt",
        sortOrder: query.sortOrder,
      },
      scope,
    );
    await this.auditRead(ctx, PUBLIC_API_AUDIT_ACTIONS.READ_TASKS, audit, {
      count: result.items.length,
    });
    return {
      items: result.items.map(toPublicTask),
      meta: pageMeta(query.page, query.pageSize, result.total),
    };
  }

  async getTask(ctx: PublicApiAuthContext, id: string, audit: AuditCtx) {
    const task = await tasksRepository.findById(id, this.taskScope(ctx));
    if (!task) {
      throw new PublicApiError(
        "Resource not found",
        404,
        PUBLIC_API_ERROR_CODES.NOT_FOUND,
      );
    }
    await this.auditRead(ctx, PUBLIC_API_AUDIT_ACTIONS.READ_TASK, audit, {
      resourceId: id,
    });
    return toPublicTask(task);
  }

  async listInvoices(
    ctx: PublicApiAuthContext,
    query: PublicApiListQueryInput,
    audit: AuditCtx,
  ) {
    const scope = this.invoiceScope(ctx);
    const result = await invoicesRepository.findMany(
      {
        page: query.page,
        limit: query.pageSize,
        search: query.search ?? "",
        sortBy: "createdAt",
        sortOrder: query.sortOrder,
      },
      scope,
    );
    await this.auditRead(ctx, PUBLIC_API_AUDIT_ACTIONS.READ_INVOICES, audit, {
      count: result.items.length,
    });
    return {
      items: result.items.map(toPublicInvoice),
      meta: pageMeta(query.page, query.pageSize, result.total),
    };
  }

  async getInvoice(ctx: PublicApiAuthContext, id: string, audit: AuditCtx) {
    const invoice = await invoicesRepository.findById(
      id,
      this.invoiceScope(ctx),
    );
    if (!invoice) {
      throw new PublicApiError(
        "Resource not found",
        404,
        PUBLIC_API_ERROR_CODES.NOT_FOUND,
      );
    }
    await this.auditRead(ctx, PUBLIC_API_AUDIT_ACTIONS.READ_INVOICE, audit, {
      resourceId: id,
    });
    return toPublicInvoice(invoice);
  }

  private projectScope(ctx: PublicApiAuthContext) {
    if (ctx.clientId) {
      return { all: false as const, clientCompanyId: ctx.clientId };
    }
    return { all: true as const };
  }

  private taskScope(ctx: PublicApiAuthContext) {
    if (ctx.clientId) {
      return { all: false as const, clientCompanyId: ctx.clientId };
    }
    return { all: true as const };
  }

  private invoiceScope(ctx: PublicApiAuthContext) {
    if (ctx.clientId) {
      return { all: false as const, clientCompanyId: ctx.clientId };
    }
    return { all: true as const };
  }

  private async auditRead(
    ctx: PublicApiAuthContext,
    action: string,
    audit: AuditCtx,
    metadata: Record<string, unknown>,
  ) {
    // Best-effort — do not block Public API reads on audit chain latency.
    void logPublicApiAuditEvent({
      userId: ctx.ownerUserId,
      action,
      resourceId: (metadata.resourceId as string | undefined) ?? ctx.keyId,
      metadata: { keyPrefix: ctx.keyPrefix, clientId: ctx.clientId, ...metadata },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }
}

type AuditCtx = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

function toPublicClient(client: {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): PublicClientDto {
  return {
    id: client.id,
    companyName: client.companyName,
    contactName: client.contactName,
    email: client.email,
    phone: client.phone,
    website: client.website,
    city: client.city,
    country: client.country,
    status: client.status,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

function toPublicProject(project: {
  id: string;
  name: string;
  description: string | null;
  status: string;
  clientId: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PublicProjectDto {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    clientId: project.clientId,
    startDate: project.startDate?.toISOString() ?? null,
    dueDate: project.dueDate?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

function toPublicTask(task: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PublicTaskDto {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId,
    dueDate: task.dueDate?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function toPublicInvoice(invoice: {
  id: string;
  invoiceNumber: string;
  status: string;
  clientId: string;
  currency: string;
  subtotal: unknown;
  taxAmount: unknown;
  total: unknown;
  issueDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PublicInvoiceDto {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    clientId: invoice.clientId,
    currency: invoice.currency,
    subtotal: Number(invoice.subtotal),
    taxAmount: Number(invoice.taxAmount),
    total: Number(invoice.total),
    issueDate: invoice.issueDate?.toISOString() ?? null,
    dueDate: invoice.dueDate?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

export const publicApiService = new PublicApiService();
