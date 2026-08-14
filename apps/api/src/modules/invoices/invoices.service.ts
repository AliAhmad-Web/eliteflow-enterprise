import {
  NotificationCategory,
  NotificationPriority,
} from "@enterprise/database";
import { UserRole } from "@enterprise/shared";
import type {
  CreateInvoiceInput,
  InvoiceDto,
  InvoiceListResponse,
  InvoicePaymentNoticeInput,
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
import { notificationDispatcher } from "../notifications/notification.dispatcher.js";

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
    this.assertPaidNotFromClient(input.status);
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
    this.assertPaidNotFromClient(input.status);

    const existing = await invoicesRepository.findById(id, { all: true });
    if (!existing) {
      throw new InvoicesError(
        "Invoice not found",
        404,
        INVOICES_ERROR_CODES.NOT_FOUND,
      );
    }

    if (
      existing.quoteId &&
      (input.items !== undefined ||
        input.discountAmount !== undefined ||
        input.taxRate !== undefined ||
        input.clientId !== undefined)
    ) {
      throw new InvoicesError(
        "Quote-linked invoice amounts cannot be changed after generation",
        403,
        INVOICES_ERROR_CODES.FORBIDDEN,
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

  async issue(id: string, actor: InvoiceActor): Promise<InvoiceDto> {
    this.assertCanMutate(actor);
    const existing = await invoicesRepository.findById(id, { all: true });
    if (!existing) {
      throw new InvoicesError(
        "Invoice not found",
        404,
        INVOICES_ERROR_CODES.NOT_FOUND,
      );
    }
    if (existing.status === "CANCELLED") {
      throw new InvoicesError(
        "Cancelled invoices cannot be issued",
        409,
        INVOICES_ERROR_CODES.VALIDATION_ERROR,
      );
    }

    const updated = await invoicesRepository.issue(id, actor.userId);
    await logInvoiceAuditEvent({
      userId: actor.userId,
      action: INVOICE_AUDIT_ACTIONS.ISSUE,
      resourceId: id,
      metadata: { invoiceNumber: updated.invoiceNumber },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toInvoiceDto(updated);
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

  /**
   * CLIENT offline payment notice — does not mark invoice paid.
   * Records history + notifies admins for verification.
   */
  async reportPaymentNotice(
    id: string,
    input: InvoicePaymentNoticeInput,
    actor: InvoiceActor,
  ): Promise<InvoiceDto> {
    if (actor.role !== UserRole.CLIENT) {
      throw new InvoicesError(
        "Only client portal users can submit offline payment notices",
        403,
        INVOICES_ERROR_CODES.FORBIDDEN,
      );
    }

    const invoice = await this.getById(id, actor);
    if (invoice.status === "PAID" || invoice.status === "CANCELLED" || invoice.paymentStatus === "PAID") {
      throw new InvoicesError(
        "This invoice cannot accept a payment notice in its current status",
        409,
        INVOICES_ERROR_CODES.VALIDATION_ERROR,
      );
    }

    const note =
      input.note?.trim() ||
      "Client reported an offline payment. Please verify and mark the invoice paid when funds clear.";

    const updated = await invoicesRepository.addPaymentNotice(id, {
      note: `Offline payment notice: ${note}`,
      actorId: actor.userId,
      status: invoice.status,
    });

    await logInvoiceAuditEvent({
      userId: actor.userId,
      action: INVOICE_AUDIT_ACTIONS.PAYMENT_NOTICE,
      resourceId: id,
      metadata: { invoiceNumber: invoice.invoiceNumber, note },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    void notificationDispatcher.notify({
      title: "Client offline payment notice",
      body: `${actor.email} reported payment for ${invoice.invoiceNumber}`,
      category: NotificationCategory.INVOICE,
      priority: NotificationPriority.HIGH,
      linkUrl: `/invoices/${id}`,
      entityType: "Invoice",
      entityId: id,
      audience: { type: "ROLE", roleCode: "ADMIN" },
      createdById: actor.userId,
    });
    void notificationDispatcher.notify({
      title: "Client offline payment notice",
      body: `${actor.email} reported payment for ${invoice.invoiceNumber}`,
      category: NotificationCategory.INVOICE,
      priority: NotificationPriority.HIGH,
      linkUrl: `/invoices/${id}`,
      entityType: "Invoice",
      entityId: id,
      audience: { type: "ROLE", roleCode: "SUPER_ADMIN" },
      createdById: actor.userId,
    });

    return toInvoiceDto(updated);
  }

  private assertPaidNotFromClient(
    status: string | undefined,
    paymentStatus?: string,
  ): void {
    if (status === "PAID" || paymentStatus === "PAID") {
      throw new InvoicesError(
        "Invoice payment status cannot be set to PAID from the client",
        403,
        INVOICES_ERROR_CODES.FORBIDDEN,
      );
    }
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
