import {
  NotificationCategory,
  NotificationPriority,
  prisma,
} from "@enterprise/database";
import {
  UserRole,
  calculatePaymentSchedule,
  calculateQuoteTotals,
  normalizeAllowedPaymentModels,
  type CreateQuoteInput,
  type GenerateQuoteInvoicesInput,
  type ListQuotesQueryInput,
  type PaymentModelValue,
  type QuoteDto,
  type QuoteListResponse,
  type QuoteStatusValue,
  type RejectQuoteInput,
  type SelectQuotePaymentModelInput,
  type UpdateQuoteInput,
} from "@enterprise/shared";

import { notificationDispatcher } from "../notifications/notification.dispatcher.js";
import {
  QUOTE_AUDIT_ACTIONS,
  logQuoteAuditEvent,
} from "./quotes.audit.js";
import { QUOTES_ERROR_CODES, QuotesError } from "./quotes.errors.js";
import {
  quotesRepository,
  type QuoteAccessScope,
} from "./quotes.repository.js";
import { toQuoteDto, type QuoteWithRelations } from "./quotes.types.js";

export interface QuoteActor {
  userId: string;
  role: string;
  email: string;
  companyId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function isAdmin(actor: QuoteActor): boolean {
  return actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN;
}

function isClient(actor: QuoteActor): boolean {
  return actor.role === UserRole.CLIENT;
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class QuotesService {
  async list(
    query: ListQuotesQueryInput,
    actor: QuoteActor,
  ): Promise<QuoteListResponse> {
    const scope = await this.resolveScope(actor);
    await this.expireOverdue(scope);
    const { items, total } = await quotesRepository.findMany(query, scope);
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    return {
      items: items.map(toQuoteDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getById(id: string, actor: QuoteActor): Promise<QuoteDto> {
    const scope = await this.resolveScope(actor);
    await this.expireIfNeeded(id, scope);
    const quote = await quotesRepository.findById(id, scope);
    if (!quote) {
      throw new QuotesError("Quote not found", 404, QUOTES_ERROR_CODES.NOT_FOUND);
    }
    return toQuoteDto(quote);
  }

  async create(input: CreateQuoteInput, actor: QuoteActor): Promise<QuoteDto> {
    this.assertIsAdmin(actor);
    const source = await this.resolveCommercialSource(input);

    const totals = calculateQuoteTotals({
      items: input.items,
      dealAmount: input.dealAmount,
      title: input.title,
      taxRate: input.taxRate ?? 0,
      discountAmount: input.discountAmount ?? 0,
    });

    let schedule;
    try {
      schedule = calculatePaymentSchedule({
        dealAmount: totals.total,
        paymentModel: input.paymentModel,
        customItems: input.schedule,
      });
    } catch (error) {
      throw new QuotesError(
        error instanceof Error ? error.message : "Invalid payment schedule",
        400,
        QUOTES_ERROR_CODES.SCHEDULE_INVALID,
        [{ field: "schedule", message: "Invalid payment schedule" }],
      );
    }

    const allowedPaymentModels = normalizeAllowedPaymentModels(
      input.paymentModel,
      input.allowedPaymentModels,
    );

    const created = await quotesRepository.create({
      clientId: source.clientId,
      projectId: source.projectId,
      customerRequestId: source.customerRequestId,
      title: input.title,
      description: emptyToNull(input.description),
      notes: emptyToNull(input.notes),
      paymentModel: input.paymentModel,
      allowedPaymentModels,
      currency: input.currency || source.currency,
      taxRate: totals.taxRate,
      discountAmount: totals.discountAmount,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
      issueDate: new Date(input.issueDate),
      expiryDate: new Date(input.expiryDate),
      createdById: actor.userId,
      items: totals.items,
      schedule,
    });

    await logQuoteAuditEvent({
      userId: actor.userId,
      action: QUOTE_AUDIT_ACTIONS.CREATE,
      resourceId: created.id,
      metadata: {
        quoteNumber: created.quoteNumber,
        projectId: created.projectId,
        customerRequestId: created.customerRequestId,
        total: Number(created.total),
        paymentModel: created.paymentModel,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toQuoteDto(created);
  }

  async update(
    id: string,
    input: UpdateQuoteInput,
    actor: QuoteActor,
  ): Promise<QuoteDto> {
    this.assertIsAdmin(actor);
    const existing = await this.requireQuote(id);
    if (existing.status !== "DRAFT") {
      throw new QuotesError(
        "Only draft quotes can be edited",
        409,
        QUOTES_ERROR_CODES.INVALID_TRANSITION,
      );
    }

    const nextItems = input.items
      ? input.items
      : existing.items?.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          sortOrder: item.sortOrder,
        }));
    const totals = calculateQuoteTotals({
      items: nextItems,
      dealAmount: input.dealAmount ?? Number(existing.total),
      title: input.title ?? existing.title,
      taxRate: input.taxRate ?? Number(existing.taxRate),
      discountAmount:
        input.discountAmount ?? String(existing.discountAmount),
    });

    const paymentModel = input.paymentModel ?? existing.paymentModel;
    const customItems =
      input.schedule ??
      existing.paymentSchedule?.map((item) => ({
        kind: item.kind,
        label: item.label,
        percent: Number(item.percent),
        amount: Number(item.amount),
        dueDate: item.dueDate?.toISOString().slice(0, 10) ?? undefined,
      }));

    let schedule;
    try {
      schedule = calculatePaymentSchedule({
        dealAmount: totals.total,
        paymentModel,
        customItems,
      });
    } catch (error) {
      throw new QuotesError(
        error instanceof Error ? error.message : "Invalid payment schedule",
        400,
        QUOTES_ERROR_CODES.SCHEDULE_INVALID,
        [{ field: "schedule", message: "Invalid payment schedule" }],
      );
    }

    const updated = await quotesRepository.updateDraft(id, {
      title: input.title,
      description:
        input.description === undefined
          ? undefined
          : emptyToNull(input.description),
      notes: input.notes === undefined ? undefined : emptyToNull(input.notes),
      paymentModel,
      allowedPaymentModels: normalizeAllowedPaymentModels(
        paymentModel,
        input.allowedPaymentModels ?? existing.allowedPaymentModels,
      ),
      currency: input.currency,
      taxRate: totals.taxRate,
      discountAmount: totals.discountAmount,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
      issueDate: input.issueDate ? new Date(input.issueDate) : undefined,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
      updatedById: actor.userId,
      items: totals.items,
      schedule,
    });

    await logQuoteAuditEvent({
      userId: actor.userId,
      action: QUOTE_AUDIT_ACTIONS.UPDATE,
      resourceId: id,
      metadata: {
        quoteNumber: updated.quoteNumber,
        total: Number(updated.total),
        paymentModel: updated.paymentModel,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    await logQuoteAuditEvent({
      userId: actor.userId,
      action: QUOTE_AUDIT_ACTIONS.SCHEDULE_UPDATE,
      resourceId: id,
      metadata: { itemCount: schedule.length },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toQuoteDto(updated);
  }

  async send(id: string, actor: QuoteActor): Promise<QuoteDto> {
    this.assertIsAdmin(actor);
    const existing = await this.requireQuote(id);
    this.assertTransition(existing.status, "SENT", ["DRAFT"]);

    const updated = await quotesRepository.updateStatus(id, {
      status: "SENT",
      sentAt: new Date(),
      updatedById: actor.userId,
    });

    await this.syncFinalDealAmount(updated);

    await logQuoteAuditEvent({
      userId: actor.userId,
      action: QUOTE_AUDIT_ACTIONS.SEND,
      resourceId: id,
      metadata: {
        quoteNumber: updated.quoteNumber,
        total: Number(updated.total),
        requestedBudget: updated.customerRequest?.expectedBudget
          ? Number(updated.customerRequest.expectedBudget)
          : null,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    const amount = `${updated.currency} ${Number(updated.total).toFixed(2)}`;
    this.notifyCustomer(updated, {
      title: "Project Approved — Advance Payment Required",
      body: `Your project has been approved. Final agreed deal amount: ${amount}. Pay the required advance to start the project.`,
    });

    return toQuoteDto(updated);
  }

  async approve(id: string, actor: QuoteActor): Promise<QuoteDto> {
    this.assertIsClient(actor);
    const scope = await this.resolveScope(actor);
    const existing = await quotesRepository.findById(id, scope);
    if (!existing) {
      throw new QuotesError("Quote not found", 404, QUOTES_ERROR_CODES.NOT_FOUND);
    }
    this.assertTransition(existing.status, "APPROVED", ["SENT"]);

    const updated = await quotesRepository.updateStatus(id, {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedById: actor.userId,
      updatedById: actor.userId,
    });

    await this.syncFinalDealAmount(updated);

    await quotesRepository.createInvoicesForSchedule({
      quote: updated,
      scheduleItemIds: (updated.paymentSchedule ?? []).map((item) => item.id),
      actorId: actor.userId,
    });
    await quotesRepository.issueDraftInvoicesForQuote(id, actor.userId);
    const withInvoices = (await quotesRepository.findById(id, { all: true }))!;

    await logQuoteAuditEvent({
      userId: actor.userId,
      action: QUOTE_AUDIT_ACTIONS.APPROVE,
      resourceId: id,
      metadata: {
        quoteNumber: withInvoices.quoteNumber,
        total: Number(withInvoices.total),
        requestedBudget: withInvoices.customerRequest?.expectedBudget
          ? Number(withInvoices.customerRequest.expectedBudget)
          : null,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    await logQuoteAuditEvent({
      userId: actor.userId,
      action: QUOTE_AUDIT_ACTIONS.INVOICE_CREATE,
      resourceId: id,
      metadata: { autoIssued: true },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    const amount = `${withInvoices.currency} ${Number(withInvoices.total).toFixed(2)}`;
    this.notifyAdmins(withInvoices, {
      title: "Customer accepted project",
      body: `${actor.email} accepted and started the project. Final deal ${amount}. Advance payment is now due.`,
    });
    this.notifyCustomer(withInvoices, {
      title: "Project accepted",
      body: `Thank you. Your project is accepted. Final deal ${amount}. Please complete the required advance payment to start.`,
    });

    return toQuoteDto(withInvoices);
  }

  async selectPaymentModel(
    id: string,
    input: SelectQuotePaymentModelInput,
    actor: QuoteActor,
  ): Promise<QuoteDto> {
    this.assertIsClient(actor);
    const scope = await this.resolveScope(actor);
    const existing = await quotesRepository.findById(id, scope);
    if (!existing) {
      throw new QuotesError("Quote not found", 404, QUOTES_ERROR_CODES.NOT_FOUND);
    }
    this.assertTransition(existing.status, "SENT", ["SENT"]);

    const allowed = normalizeAllowedPaymentModels(
      existing.paymentModel,
      existing.allowedPaymentModels,
    );
    if (!allowed.includes(input.paymentModel)) {
      throw new QuotesError(
        "That payment option is not configured for this deal",
        400,
        QUOTES_ERROR_CODES.SCHEDULE_INVALID,
        [{ field: "paymentModel", message: "Payment model is not allowed" }],
      );
    }
    if (
      (input.paymentModel === "CUSTOM" || input.paymentModel === "MILESTONE") &&
      input.paymentModel !== existing.paymentModel
    ) {
      throw new QuotesError(
        "Custom payment schedules can only be configured by EliteFlow",
        400,
        QUOTES_ERROR_CODES.SCHEDULE_INVALID,
      );
    }
    if ((existing.paymentSchedule ?? []).some((item) => item.invoice && item.invoice.deletedAt == null)) {
      throw new QuotesError(
        "Payment terms cannot be changed after invoices exist",
        409,
        QUOTES_ERROR_CODES.INVALID_TRANSITION,
      );
    }

    let schedule;
    try {
      schedule = calculatePaymentSchedule({
        dealAmount: Number(existing.total),
        paymentModel: input.paymentModel as PaymentModelValue,
      });
    } catch (error) {
      throw new QuotesError(
        error instanceof Error ? error.message : "Invalid payment schedule",
        400,
        QUOTES_ERROR_CODES.SCHEDULE_INVALID,
      );
    }

    const updated = await quotesRepository.replaceSchedule(id, {
      paymentModel: input.paymentModel,
      schedule,
      updatedById: actor.userId,
    });

    await logQuoteAuditEvent({
      userId: actor.userId,
      action: QUOTE_AUDIT_ACTIONS.SCHEDULE_UPDATE,
      resourceId: id,
      metadata: {
        paymentModel: input.paymentModel,
        total: Number(updated.total),
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toQuoteDto(updated);
  }

  async reject(
    id: string,
    input: RejectQuoteInput,
    actor: QuoteActor,
  ): Promise<QuoteDto> {
    this.assertIsClient(actor);
    const scope = await this.resolveScope(actor);
    const existing = await quotesRepository.findById(id, scope);
    if (!existing) {
      throw new QuotesError("Quote not found", 404, QUOTES_ERROR_CODES.NOT_FOUND);
    }
    this.assertTransition(existing.status, "REJECTED", ["SENT"]);

    const updated = await quotesRepository.updateStatus(id, {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectedById: actor.userId,
      rejectionReason: input.reason,
      updatedById: actor.userId,
    });

    await logQuoteAuditEvent({
      userId: actor.userId,
      action: QUOTE_AUDIT_ACTIONS.REJECT,
      resourceId: id,
      metadata: { quoteNumber: updated.quoteNumber, reason: input.reason },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    this.notifyAdmins(updated, {
      title: "Quote rejected",
      body: `${actor.email} rejected quote ${updated.quoteNumber}: ${input.reason.substring(0, 180)}`,
    });

    return toQuoteDto(updated);
  }

  async cancel(id: string, actor: QuoteActor): Promise<QuoteDto> {
    this.assertIsAdmin(actor);
    const existing = await this.requireQuote(id);
    this.assertTransition(existing.status, "CANCELLED", ["DRAFT", "SENT"]);

    const updated = await quotesRepository.updateStatus(id, {
      status: "CANCELLED",
      cancelledAt: new Date(),
      updatedById: actor.userId,
    });

    await logQuoteAuditEvent({
      userId: actor.userId,
      action: QUOTE_AUDIT_ACTIONS.CANCEL,
      resourceId: id,
      metadata: { quoteNumber: updated.quoteNumber },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toQuoteDto(updated);
  }

  /**
   * After Admin confirms the final deal, open the standard customer
   * advance-payment terms automatically. No separate quote/advance UI.
   */
  async issueCustomerAdvanceTerms(
    request: {
      id: string;
      title: string;
      convertedProjectId: string | null;
      agreedAmount: unknown;
      currency: string;
    },
    actor: QuoteActor,
  ): Promise<QuoteDto | null> {
    this.assertIsAdmin(actor);
    const dealAmount = Number(request.agreedAmount);
    if (!request.convertedProjectId || !Number.isFinite(dealAmount) || dealAmount <= 0) {
      return null;
    }

    const existing = await prisma.quote.findFirst({
      where: {
        customerRequestId: request.id,
        deletedAt: null,
        status: { in: ["DRAFT", "SENT", "APPROVED"] },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, status: true },
    });
    if (existing) {
      if (existing.status === "DRAFT") {
        return this.send(existing.id, actor);
      }
      return this.getById(existing.id, actor);
    }

    const today = new Date().toISOString().slice(0, 10);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 14);
    const created = await this.create(
      {
        customerRequestId: request.id,
        title: request.title,
        issueDate: today,
        expiryDate: expiry.toISOString().slice(0, 10),
        currency: request.currency || "USD",
        dealAmount: String(dealAmount),
        taxRate: 0,
        discountAmount: "0",
        paymentModel: "SPLIT_30_70",
        allowedPaymentModels: [
          "SPLIT_30_70",
          "SPLIT_35_65",
          "SPLIT_40_60",
        ],
      },
      actor,
    );
    return this.send(created.id, actor);
  }

  async generateInvoices(
    id: string,
    input: GenerateQuoteInvoicesInput,
    actor: QuoteActor,
  ): Promise<QuoteDto> {
    this.assertIsAdmin(actor);
    const existing = await this.requireQuote(id);
    if (existing.status !== "APPROVED") {
      throw new QuotesError(
        "Invoices can only be generated after the customer approves the quote",
        409,
        QUOTES_ERROR_CODES.INVALID_TRANSITION,
      );
    }

    const schedule = existing.paymentSchedule ?? [];
    const requested = input.scheduleItemIds?.length
      ? input.scheduleItemIds
      : schedule.map((item) => item.id);
    const allowed = new Set(schedule.map((item) => item.id));
    for (const scheduleId of requested) {
      if (!allowed.has(scheduleId)) {
        throw new QuotesError(
          "Payment schedule item does not belong to this quote",
          400,
          QUOTES_ERROR_CODES.VALIDATION_ERROR,
        );
      }
    }

    await quotesRepository.createInvoicesForSchedule({
      quote: existing,
      scheduleItemIds: requested,
      actorId: actor.userId,
    });
    await quotesRepository.issueDraftInvoicesForQuote(id, actor.userId);
    const issued = (await quotesRepository.findById(id, { all: true }))!;

    await logQuoteAuditEvent({
      userId: actor.userId,
      action: QUOTE_AUDIT_ACTIONS.INVOICE_CREATE,
      resourceId: id,
      metadata: {
        quoteNumber: issued.quoteNumber,
        scheduleItemIds: requested,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toQuoteDto(issued);
  }

  private async syncFinalDealAmount(quote: QuoteWithRelations): Promise<void> {
    const dealAmount = Number(quote.total);
    if (quote.customerRequestId) {
      await quotesRepository.syncRequestAgreedAmount(
        quote.customerRequestId,
        dealAmount,
      );
    }
    await prisma.project.update({
      where: { id: quote.projectId },
      data: { budget: dealAmount },
    });
  }

  private async resolveCommercialSource(input: CreateQuoteInput): Promise<{
    clientId: string;
    projectId: string;
    customerRequestId: string | null;
    currency: string;
  }> {
    const requestId = emptyToNull(input.customerRequestId);
    const projectIdInput = emptyToNull(input.projectId);

    if (requestId) {
      const request = await quotesRepository.findCustomerRequest(requestId);
      if (!request) {
        throw new QuotesError(
          "Customer request not found",
          400,
          QUOTES_ERROR_CODES.REQUEST_NOT_FOUND,
          [{ field: "customerRequestId", message: "Customer request not found" }],
        );
      }
      if (request.status !== "APPROVED" && request.status !== "CONVERTED") {
        throw new QuotesError(
          "Quotes can only be created from an approved project request",
          400,
          QUOTES_ERROR_CODES.REQUEST_NOT_ELIGIBLE,
          [
            {
              field: "customerRequestId",
              message: "Request must be approved first",
            },
          ],
        );
      }
      const projectId = request.convertedProjectId ?? request.targetProjectId;
      if (!projectId) {
        throw new QuotesError(
          "This request has no linked project yet. Convert it first — do not create a duplicate project from the quote.",
          400,
          QUOTES_ERROR_CODES.PROJECT_NOT_FOUND,
        );
      }
      if (!request.clientId) {
        throw new QuotesError(
          "Customer account is not linked yet",
          400,
          QUOTES_ERROR_CODES.VALIDATION_ERROR,
        );
      }
      return {
        clientId: request.clientId,
        projectId,
        customerRequestId: request.id,
        currency: request.currency,
      };
    }

    if (!projectIdInput) {
      throw new QuotesError(
        "A customer request or existing project is required",
        400,
        QUOTES_ERROR_CODES.VALIDATION_ERROR,
      );
    }

    const project = await quotesRepository.findProject(projectIdInput);
    if (!project || !project.clientId) {
      throw new QuotesError(
        "Project not found",
        400,
        QUOTES_ERROR_CODES.PROJECT_NOT_FOUND,
        [{ field: "projectId", message: "Project not found" }],
      );
    }

    return {
      clientId: project.clientId,
      projectId: project.id,
      customerRequestId: null,
      currency: "USD",
    };
  }

  private async expireOverdue(scope: QuoteAccessScope): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        status: "SENT",
        expiryDate: { lt: today },
        ...this.prismaScope(scope),
      },
      select: { id: true, createdById: true, updatedById: true },
      take: 50,
    });
    for (const quote of overdue) {
      await quotesRepository.updateStatus(quote.id, {
        status: "EXPIRED",
        updatedById: quote.updatedById ?? quote.createdById ?? quote.id,
      });
      await logQuoteAuditEvent({
        action: QUOTE_AUDIT_ACTIONS.EXPIRE,
        resourceId: quote.id,
      });
    }
  }

  private async expireIfNeeded(
    id: string,
    scope: QuoteAccessScope,
  ): Promise<void> {
    const quote = await quotesRepository.findById(id, scope);
    if (!quote || quote.status !== "SENT") return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (quote.expiryDate < today) {
      await quotesRepository.updateStatus(id, {
        status: "EXPIRED",
        updatedById: quote.updatedById ?? quote.createdById ?? quote.id,
      });
      await logQuoteAuditEvent({
        action: QUOTE_AUDIT_ACTIONS.EXPIRE,
        resourceId: id,
      });
    }
  }

  private prismaScope(scope: QuoteAccessScope) {
    if (scope.all) return {};
    const clauses = [];
    if (scope.clientCompanyId) clauses.push({ clientId: scope.clientCompanyId });
    if (scope.createdByRequestUserId) {
      clauses.push({
        customerRequest: { createdById: scope.createdByRequestUserId },
      });
    }
    if (clauses.length === 0) {
      return { id: "00000000-0000-0000-0000-000000000000" };
    }
    if (clauses.length === 1) return clauses[0];
    return { OR: clauses };
  }

  private async requireQuote(id: string): Promise<QuoteWithRelations> {
    const quote = await quotesRepository.findById(id, { all: true });
    if (!quote) {
      throw new QuotesError("Quote not found", 404, QUOTES_ERROR_CODES.NOT_FOUND);
    }
    return quote;
  }

  private assertIsAdmin(actor: QuoteActor): void {
    if (!isAdmin(actor)) {
      throw new QuotesError(
        "Only administrators can manage quotes",
        403,
        QUOTES_ERROR_CODES.FORBIDDEN,
      );
    }
  }

  private assertIsClient(actor: QuoteActor): void {
    if (!isClient(actor)) {
      throw new QuotesError(
        "Only the customer can approve or reject this quote",
        403,
        QUOTES_ERROR_CODES.FORBIDDEN,
      );
    }
  }

  private assertTransition(
    current: QuoteStatusValue,
    next: QuoteStatusValue,
    allowedFrom: QuoteStatusValue[],
  ): void {
    if (!allowedFrom.includes(current)) {
      throw new QuotesError(
        `Cannot transition from ${current} to ${next}`,
        409,
        QUOTES_ERROR_CODES.INVALID_TRANSITION,
      );
    }
  }

  private async resolveScope(actor: QuoteActor): Promise<QuoteAccessScope> {
    if (isClient(actor)) {
      const companyId =
        actor.companyId !== undefined
          ? actor.companyId
          : await this.loadCompanyId(actor.userId);
      return {
        all: false,
        createdByRequestUserId: actor.userId,
        clientCompanyId: companyId ?? null,
      };
    }
    return { all: true };
  }

  private async loadCompanyId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    return user?.companyId ?? null;
  }

  private notifyCustomer(
    quote: QuoteWithRelations,
    content: { title: string; body: string },
  ): void {
    const userId = quote.customerRequest?.createdById;
    if (!userId) return;
    void notificationDispatcher.notify({
      title: content.title,
      body: content.body,
      category: NotificationCategory.INVOICE,
      priority: NotificationPriority.HIGH,
      linkUrl: `/quotes/${quote.id}`,
      entityType: "Quote",
      entityId: quote.id,
      audience: { type: "INDIVIDUAL", userId },
      createdById: quote.updatedById ?? quote.createdById ?? userId,
    });
  }

  private notifyAdmins(
    quote: QuoteWithRelations,
    content: { title: string; body: string },
  ): void {
    for (const roleCode of ["ADMIN", "SUPER_ADMIN"] as const) {
      void notificationDispatcher.notify({
        title: content.title,
        body: content.body,
        category: NotificationCategory.INVOICE,
        priority: NotificationPriority.HIGH,
        linkUrl: `/quotes/${quote.id}`,
        entityType: "Quote",
        entityId: quote.id,
        audience: { type: "ROLE", roleCode },
        createdById: quote.updatedById ?? quote.createdById ?? quote.id,
      });
    }
  }
}

export const quotesService = new QuotesService();
