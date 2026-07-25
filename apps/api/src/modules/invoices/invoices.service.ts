import { UserRole } from "@enterprise/shared";
import type {
  CreateInvoiceInput,
  InvoiceDto,
  InvoiceListResponse,
  InvoiceStats,
  ListInvoicesQueryInput,
  UpdateInvoiceInput,
} from "@enterprise/shared";

import {
  INVOICE_AUDIT_ACTIONS,
  logInvoiceAuditEvent,
} from "./invoices.audit.js";
import { INVOICES_ERROR_CODES, InvoicesError } from "./invoices.errors.js";
import { buildInvoicePdf } from "./invoices.pdf.js";
import {
  invoicesRepository,
  type InvoiceAccessScope,
} from "./invoices.repository.js";
import { toInvoiceDto } from "./invoices.types.js";

export interface InvoiceActor {
  userId: string;
  role: string;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class InvoicesService {
  async list(
    query: ListInvoicesQueryInput,
    actor: InvoiceActor,
  ): Promise<InvoiceListResponse> {
    const scope = await this.resolveScope(actor);
    const { items, total } = await invoicesRepository.findMany(query, scope);
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    return {
      items: items.map(toInvoiceDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getById(id: string, actor: InvoiceActor): Promise<InvoiceDto> {
    const scope = await this.resolveScope(actor);
    const invoice = await invoicesRepository.findById(id, scope);

    if (!invoice) {
      throw new InvoicesError(
        "Invoice not found",
        404,
        INVOICES_ERROR_CODES.NOT_FOUND,
      );
    }

    return toInvoiceDto(invoice);
  }

  async create(
    input: CreateInvoiceInput,
    actor: InvoiceActor,
  ): Promise<InvoiceDto> {
    this.assertCanMutate(actor);
    await this.assertClientAndProject(input.clientId, input.projectId);

    const created = await invoicesRepository.create(input, actor.userId);

    await logInvoiceAuditEvent({
      userId: actor.userId,
      action: INVOICE_AUDIT_ACTIONS.CREATE,
      resourceId: created.id,
      metadata: {
        invoiceNumber: created.invoiceNumber,
        clientId: created.clientId,
        total: Number(created.total),
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toInvoiceDto(created);
  }

  async update(
    id: string,
    input: UpdateInvoiceInput,
    actor: InvoiceActor,
  ): Promise<InvoiceDto> {
    this.assertCanMutate(actor);

    const existing = await invoicesRepository.findById(id, { all: true });
    if (!existing) {
      throw new InvoicesError(
        "Invoice not found",
        404,
        INVOICES_ERROR_CODES.NOT_FOUND,
      );
    }

    const clientId = input.clientId ?? existing.clientId;
    if (input.clientId !== undefined || input.projectId !== undefined) {
      await this.assertClientAndProject(clientId, input.projectId);
    }

    const updated = await invoicesRepository.update(
      id,
      input,
      actor.userId,
      existing.status,
    );

    await logInvoiceAuditEvent({
      userId: actor.userId,
      action: INVOICE_AUDIT_ACTIONS.UPDATE,
      resourceId: id,
      metadata: { invoiceNumber: updated.invoiceNumber },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toInvoiceDto(updated);
  }

  async remove(id: string, actor: InvoiceActor): Promise<{ id: string }> {
    this.assertCanMutate(actor);

    const existing = await invoicesRepository.findById(id, { all: true });
    if (!existing) {
      throw new InvoicesError(
        "Invoice not found",
        404,
        INVOICES_ERROR_CODES.NOT_FOUND,
      );
    }

    await invoicesRepository.softDelete(id, actor.userId);

    await logInvoiceAuditEvent({
      userId: actor.userId,
      action: INVOICE_AUDIT_ACTIONS.DELETE,
      resourceId: id,
      metadata: { invoiceNumber: existing.invoiceNumber },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id };
  }

  async getStats(actor: InvoiceActor): Promise<InvoiceStats> {
    const scope = await this.resolveScope(actor);
    return invoicesRepository.getStats(scope);
  }

  async getPdf(
    id: string,
    actor: InvoiceActor,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.getById(id, actor);
    const buffer = buildInvoicePdf(invoice);

    await logInvoiceAuditEvent({
      userId: actor.userId,
      action: INVOICE_AUDIT_ACTIONS.PDF,
      resourceId: id,
      metadata: { invoiceNumber: invoice.invoiceNumber },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      buffer,
      filename: `${invoice.invoiceNumber}.pdf`,
    };
  }

  private async assertClientAndProject(
    clientId: string,
    projectId: string | undefined,
  ): Promise<void> {
    const clientExists = await invoicesRepository.clientExists(clientId);
    if (!clientExists) {
      throw new InvoicesError(
        "Selected client was not found",
        400,
        INVOICES_ERROR_CODES.CLIENT_NOT_FOUND,
        [{ field: "clientId", message: "Selected client was not found" }],
      );
    }

    if (projectId && projectId.trim().length > 0) {
      const exists = await invoicesRepository.projectExists(
        projectId,
        clientId,
      );
      if (!exists) {
        throw new InvoicesError(
          "Selected project was not found for this client",
          400,
          INVOICES_ERROR_CODES.PROJECT_NOT_FOUND,
          [
            {
              field: "projectId",
              message: "Selected project was not found for this client",
            },
          ],
        );
      }
    }
  }

  private assertCanMutate(actor: InvoiceActor): void {
    if (
      actor.role !== UserRole.ADMIN &&
      actor.role !== UserRole.SUPER_ADMIN
    ) {
      throw new InvoicesError(
        "You do not have permission to modify invoices",
        403,
        INVOICES_ERROR_CODES.FORBIDDEN,
      );
    }
  }

  private async resolveScope(
    actor: InvoiceActor,
  ): Promise<InvoiceAccessScope> {
    if (
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.EMPLOYEE
    ) {
      // Employees may view all invoices (read-only); mutations blocked separately.
      return { all: true };
    }

    if (actor.role === UserRole.CLIENT) {
      const companyId = await invoicesRepository.getUserCompanyId(
        actor.userId,
      );
      return { all: false, clientCompanyId: companyId };
    }

    return { all: false };
  }
}

export const invoicesService = new InvoicesService();
