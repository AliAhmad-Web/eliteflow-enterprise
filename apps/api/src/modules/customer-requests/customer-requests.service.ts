import {
  NotificationCategory,
  NotificationPriority,
  prisma,
} from "@enterprise/database";
import {
  UserRole,
  type AddCustomerRequestAttachmentInput,
  type ApproveCustomerRequestInput,
  type ClarifyCustomerRequestInput,
  type ConvertCustomerRequestInput,
  type CreateCustomerRequestInput,
  type CreateProjectInput,
  type CreateTaskInput,
  type CustomerRequestDto,
  type CustomerRequestPriorityValue,
  type CustomerRequestStatusValue,
  type ListCustomerRequestsQueryInput,
  type RejectCustomerRequestInput,
  type StartCustomerRequestReviewInput,
  type UpdateCustomerRequestInput,
  isCustomerRequestContinuationType,
  REOPEN_ELIGIBLE_PROJECT_STATUSES,
} from "@enterprise/shared";

import { attachmentSecurityService } from "../files/attachment-security.service.js";
import { ensurePortalCompanyLink } from "../clients/client-company-onboarding.service.js";
import { notificationDispatcher } from "../notifications/notification.dispatcher.js";
import {
  logProjectAuditEvent,
  PROJECT_AUDIT_ACTIONS,
} from "../projects/projects.audit.js";
import { projectsService } from "../projects/projects.service.js";
import { quotesService } from "../quotes/quotes.service.js";
import { tasksService } from "../tasks/tasks.service.js";
import {
  CUSTOMER_REQUEST_AUDIT_ACTIONS,
  logCustomerRequestAuditEvent,
} from "./customer-requests.audit.js";
import {
  CUSTOMER_REQUESTS_ERROR_CODES,
  CustomerRequestsError,
} from "./customer-requests.errors.js";
import {
  customerRequestsRepository,
  type CustomerRequestAccessScope,
} from "./customer-requests.repository.js";
import {
  toCustomerRequestDto,
  type ClarificationHistoryEntry,
  type CustomerRequestWithRelations,
} from "./customer-requests.types.js";

export interface CustomerRequestActor {
  userId: string;
  role: string;
  email: string;
  companyId?: string | null;
  permissions?: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
}

export type CustomerRequestListResponse = {
  items: CustomerRequestDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    timestamp: string;
  };
};

function parseHistory(
  value: CustomerRequestWithRelations["clarificationHistory"],
): ClarificationHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries: ClarificationHistoryEntry[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const record = row as Record<string, unknown>;
    const from =
      record.from === "admin" || record.from === "customer"
        ? record.from
        : null;
    const message =
      typeof record.message === "string" ? record.message.trim() : "";
    const at = typeof record.at === "string" ? record.at : "";
    if (!from || !message || !at) continue;
    entries.push({ at, from, message });
  }
  return entries;
}

function appendHistory(
  existing: CustomerRequestWithRelations["clarificationHistory"],
  entry: ClarificationHistoryEntry,
): ClarificationHistoryEntry[] {
  return [...parseHistory(existing), entry];
}

function upsertCustomerReply(
  existing: CustomerRequestWithRelations["clarificationHistory"],
  message: string,
): ClarificationHistoryEntry[] {
  const history = parseHistory(existing);
  const entry: ClarificationHistoryEntry = {
    at: new Date().toISOString(),
    from: "customer",
    message,
  };
  const last = history[history.length - 1];
  if (last?.from === "customer") {
    return [...history.slice(0, -1), entry];
  }
  return [...history, entry];
}

const EDITABLE_STATUSES = new Set<CustomerRequestStatusValue>([
  "DRAFT",
  "CLARIFICATION_REQUESTED",
]);

const CLIENT_ATTACH_STATUSES = new Set<CustomerRequestStatusValue>([
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CLARIFICATION_REQUESTED",
  "CUSTOMER_RESPONDED",
]);

const REOPEN_STATUSES = new Set<string>(REOPEN_ELIGIBLE_PROJECT_STATUSES);

function isAdmin(actor: CustomerRequestActor): boolean {
  const role = String(actor.role ?? "").toUpperCase();
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

function isClient(actor: CustomerRequestActor): boolean {
  return String(actor.role ?? "").toUpperCase() === UserRole.CLIENT;
}

function presentRequest(
  request: CustomerRequestWithRelations,
  actor: CustomerRequestActor,
): CustomerRequestDto {
  const dto = toCustomerRequestDto(request);
  if (!isClient(actor)) return dto;
  return { ...dto, staffNotes: null };
}

function combineConvertDescription(
  request: CustomerRequestWithRelations,
): string {
  const description = request.description?.trim() ?? "";
  const requirements = request.requirements?.trim() ?? "";
  const notes = request.additionalNotes?.trim() ?? "";
  return `${description}\n\nRequirements:\n${requirements}\n\nAdditional notes:\n${notes}`;
}

function mapProjectPriority(
  priority: CustomerRequestPriorityValue,
): CreateProjectInput["priority"] {
  return priority;
}

function mapTaskPriority(
  priority: CustomerRequestPriorityValue,
): CreateTaskInput["priority"] {
  return priority === "URGENT" ? "CRITICAL" : priority;
}

function dueDateString(value: Date | null): string {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function budgetString(value: { toString(): string } | null): string {
  if (value === null) {
    return "";
  }

  return String(Number(value));
}

export class CustomerRequestsService {
  async list(
    query: ListCustomerRequestsQueryInput,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestListResponse> {
    const scope = await this.resolveScope(actor, { requireLinked: false });
    const { items, total } = await customerRequestsRepository.findMany(
      query,
      scope,
    );
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    return {
      items: items.map((item) => presentRequest(item, actor)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getById(
    id: string,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestDto> {
    const scope = await this.resolveScope(actor, { requireLinked: false });
    const request = await customerRequestsRepository.findById(id, scope);

    if (!request) {
      throw new CustomerRequestsError(
        "Customer request not found",
        404,
        CUSTOMER_REQUESTS_ERROR_CODES.NOT_FOUND,
      );
    }

    return presentRequest(request, actor);
  }

  async create(
    input: CreateCustomerRequestInput,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestDto> {
    this.assertIsClient(actor);
    const continuation = isCustomerRequestContinuationType(input.type);

    let clientId = actor.companyId ?? null;
    let targetProjectId = input.targetProjectId ?? null;
    let parentRequestId: string | null = null;

    if (continuation) {
      if (!targetProjectId) {
        throw new CustomerRequestsError(
          "A project is required for this request type",
          400,
          CUSTOMER_REQUESTS_ERROR_CODES.VALIDATION_ERROR,
          [{ field: "targetProjectId", message: "Project is required" }],
        );
      }
      const owned = await this.requireOwnedProject(targetProjectId, actor);
      targetProjectId = owned.id;
      clientId = owned.clientId ?? clientId;
      if (input.type === "REOPEN_PROJECT" && !REOPEN_STATUSES.has(owned.status)) {
        throw new CustomerRequestsError(
          "Only completed, cancelled, or on-hold projects can be reopened",
          400,
          CUSTOMER_REQUESTS_ERROR_CODES.PROJECT_NOT_ELIGIBLE,
          [
            {
              field: "targetProjectId",
              message: "Project is already active",
            },
          ],
        );
      }
      parentRequestId =
        await customerRequestsRepository.findOriginalRequestIdForProject(
          owned.id,
        );
    } else if (targetProjectId) {
      const owned = await this.requireOwnedProject(targetProjectId, actor);
      targetProjectId = owned.id;
      clientId = owned.clientId ?? clientId;
    }

    const attachments = input.attachments?.length
      ? await attachmentSecurityService.secureAttachments(
          input.attachments,
          actor,
        )
      : [];

    const submitNow = input.submit === true;
    const created = await customerRequestsRepository.create({
      clientId,
      createdById: actor.userId,
      type: input.type,
      title: input.title,
      description: input.description,
      requirements: input.requirements,
      preferredDeadline: input.preferredDeadline,
      expectedBudget: input.expectedBudget,
      currency: input.currency,
      priority: input.priority,
      additionalNotes: input.additionalNotes,
      targetProjectId,
      parentRequestId,
      status: submitNow ? "SUBMITTED" : "DRAFT",
      submittedAt: submitNow ? new Date() : null,
      attachments,
    });

    await logCustomerRequestAuditEvent({
      userId: actor.userId,
      action: CUSTOMER_REQUEST_AUDIT_ACTIONS.CREATE,
      resourceId: created.id,
      metadata: {
        type: created.type,
        status: created.status,
        submitted: submitNow,
        continuation,
        targetProjectId,
        parentRequestId,
        onboardingUnlinked: !clientId,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    if (submitNow) {
      await logCustomerRequestAuditEvent({
        userId: actor.userId,
        action: CUSTOMER_REQUEST_AUDIT_ACTIONS.SUBMIT,
        resourceId: created.id,
        metadata: { type: created.type, onboardingUnlinked: !clientId },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
      this.notifyStaffOnSubmit(created, actor);
    }

    return presentRequest(created, actor);
  }

  async update(
    id: string,
    input: UpdateCustomerRequestInput,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestDto> {
    this.assertIsClient(actor);
    const existing = await this.requireOwnedRequest(id, actor);
    const clientId = actor.companyId ?? existing.clientId ?? null;

    if (!EDITABLE_STATUSES.has(existing.status)) {
      throw new CustomerRequestsError(
        "Only draft or clarification-requested requests can be edited",
        400,
        CUSTOMER_REQUESTS_ERROR_CODES.INVALID_TRANSITION,
      );
    }

    if (input.clarificationResponse !== undefined) {
      if (existing.status !== "CLARIFICATION_REQUESTED") {
        throw new CustomerRequestsError(
          "A response to admin can only be saved when clarification is requested",
          400,
          CUSTOMER_REQUESTS_ERROR_CODES.INVALID_TRANSITION,
        );
      }
    }

    const patch: UpdateCustomerRequestInput = { ...input };

    if (isCustomerRequestContinuationType(existing.type)) {
      delete patch.type;
      delete patch.targetProjectId;
    } else if (patch.type && isCustomerRequestContinuationType(patch.type)) {
      throw new CustomerRequestsError(
        "An intake request cannot be changed into a project change request",
        400,
        CUSTOMER_REQUESTS_ERROR_CODES.VALIDATION_ERROR,
        [{ field: "type", message: "Invalid request type change" }],
      );
    } else if (patch.targetProjectId) {
      await this.requireOwnedProject(patch.targetProjectId, actor);
    }
    if (existing.status !== "DRAFT") {
      delete patch.expectedBudget;
    }

    const reply =
      typeof patch.clarificationResponse === "string"
        ? patch.clarificationResponse.trim()
        : "";
    const clarificationHistory =
      existing.status === "CLARIFICATION_REQUESTED" && reply
        ? upsertCustomerReply(existing.clarificationHistory, reply)
        : undefined;

    const updated = await customerRequestsRepository.update(id, patch, {
      clarificationHistory,
    });

    await logCustomerRequestAuditEvent({
      userId: actor.userId,
      action: CUSTOMER_REQUEST_AUDIT_ACTIONS.UPDATE,
      resourceId: id,
      metadata: {
        fields: Object.keys(patch),
        clarificationReply: Boolean(reply),
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return presentRequest(updated, actor);
  }

  async submit(
    id: string,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestDto> {
    this.assertIsClient(actor);
    const existing = await this.requireOwnedRequest(id, actor);

    const nextStatus: CustomerRequestStatusValue =
      existing.status === "CLARIFICATION_REQUESTED"
        ? "CUSTOMER_RESPONDED"
        : "SUBMITTED";

    this.assertTransition(existing.status, nextStatus, [
      "DRAFT",
      "CLARIFICATION_REQUESTED",
    ]);

    const updated = await customerRequestsRepository.updateStatus(id, {
      status: nextStatus,
      submittedAt: new Date(),
    });

    await logCustomerRequestAuditEvent({
      userId: actor.userId,
      action: CUSTOMER_REQUEST_AUDIT_ACTIONS.SUBMIT,
      resourceId: id,
      metadata: {
        fromStatus: existing.status,
        onboardingUnlinked: !existing.clientId && !actor.companyId,
        hasClarificationResponse: Boolean(existing.clarificationResponse),
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    this.notifyStaffOnSubmit(updated, actor);

    return presentRequest(updated, actor);
  }

  async withdraw(
    id: string,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestDto> {
    this.assertIsClient(actor);
    const existing = await this.requireOwnedRequest(id, actor);

    this.assertTransition(existing.status, "CANCELLED", [
      "SUBMITTED",
      "CLARIFICATION_REQUESTED",
      "CUSTOMER_RESPONDED",
    ]);

    const updated = await customerRequestsRepository.updateStatus(id, {
      status: "CANCELLED",
    });

    await logCustomerRequestAuditEvent({
      userId: actor.userId,
      action: CUSTOMER_REQUEST_AUDIT_ACTIONS.WITHDRAW,
      resourceId: id,
      metadata: { fromStatus: existing.status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return presentRequest(updated, actor);
  }

  async addAttachment(
    id: string,
    input: AddCustomerRequestAttachmentInput,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestDto> {
    this.assertIsClient(actor);
    const existing = await this.requireOwnedRequest(id, actor);

    if (!CLIENT_ATTACH_STATUSES.has(existing.status)) {
      throw new CustomerRequestsError(
        "Attachments cannot be added in the current status",
        400,
        CUSTOMER_REQUESTS_ERROR_CODES.INVALID_TRANSITION,
      );
    }

    const securedList = await attachmentSecurityService.secureAttachments(
      [input],
      actor,
    );
    const secured = securedList[0];
    if (!secured) {
      throw new CustomerRequestsError(
        "Attachment could not be secured",
        400,
        CUSTOMER_REQUESTS_ERROR_CODES.VALIDATION_ERROR,
      );
    }

    const updated = await customerRequestsRepository.addAttachment(
      id,
      secured,
      actor.userId,
    );

    await logCustomerRequestAuditEvent({
      userId: actor.userId,
      action: CUSTOMER_REQUEST_AUDIT_ACTIONS.ATTACH,
      resourceId: id,
      metadata: {
        fileName: secured.fileName,
        managedFileId: secured.managedFileId,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return presentRequest(updated, actor);
  }

  async startReview(
    id: string,
    input: StartCustomerRequestReviewInput,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestDto> {
    this.assertIsReviewer(actor);
    const existing = await this.requireRequest(id);

    this.assertTransition(existing.status, "UNDER_REVIEW", [
      "SUBMITTED",
      "CUSTOMER_RESPONDED",
    ]);

    const updated = await customerRequestsRepository.updateStatus(id, {
      status: "UNDER_REVIEW",
      staffNotes: input.staffNotes,
      reviewedById: actor.userId,
      reviewedAt: new Date(),
    });

    await logCustomerRequestAuditEvent({
      userId: actor.userId,
      action: CUSTOMER_REQUEST_AUDIT_ACTIONS.REVIEW,
      resourceId: id,
      metadata: { fromStatus: existing.status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return presentRequest(updated, actor);
  }

  async requestClarification(
    id: string,
    input: ClarifyCustomerRequestInput,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestDto> {
    this.assertIsReviewer(actor);
    const existing = await this.requireRequest(id);

    this.assertTransition(existing.status, "CLARIFICATION_REQUESTED", [
      "SUBMITTED",
      "UNDER_REVIEW",
      "CUSTOMER_RESPONDED",
    ]);

    const clarificationHistory = appendHistory(existing.clarificationHistory, {
      at: new Date().toISOString(),
      from: "admin",
      message: input.message.trim(),
    });

    const updated = await customerRequestsRepository.updateStatus(id, {
      status: "CLARIFICATION_REQUESTED",
      clarificationMessage: input.message,
      clarificationResponse: null,
      clarificationHistory,
      staffNotes: input.staffNotes,
      reviewedById: actor.userId,
      reviewedAt: new Date(),
    });

    await logCustomerRequestAuditEvent({
      userId: actor.userId,
      action: CUSTOMER_REQUEST_AUDIT_ACTIONS.CLARIFICATION,
      resourceId: id,
      metadata: { fromStatus: existing.status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    this.notifyCreator(updated, {
      title: "Clarification requested",
      body: `Staff requested clarification on "${updated.title}": ${input.message.substring(0, 180)}`,
    });

    return presentRequest(updated, actor);
  }

  async approve(
    id: string,
    input: ApproveCustomerRequestInput,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestDto> {
    this.assertIsReviewer(actor);
    const existing = await this.requireRequest(id);

    this.assertTransition(existing.status, "APPROVED", [
      "SUBMITTED",
      "UNDER_REVIEW",
      "CUSTOMER_RESPONDED",
    ]);

    const continuation = isCustomerRequestContinuationType(existing.type);
    const agreedAmount = input.agreedAmount?.trim() || null;

    if (!continuation) {
      if (!agreedAmount || Number(agreedAmount) <= 0) {
        throw new CustomerRequestsError(
          "Final agreed amount is required",
          400,
          CUSTOMER_REQUESTS_ERROR_CODES.VALIDATION_ERROR,
          [
            {
              field: "agreedAmount",
              message: "Final agreed amount is required",
            },
          ],
        );
      }
    }

    await this.activateSubmittingCustomer(existing, actor);

    const updated = await customerRequestsRepository.updateStatus(id, {
      status: "APPROVED",
      staffNotes: input.staffNotes,
      agreedAmount,
      reviewedById: actor.userId,
      reviewedAt: new Date(),
    });

    await logCustomerRequestAuditEvent({
      userId: actor.userId,
      action: CUSTOMER_REQUEST_AUDIT_ACTIONS.APPROVE,
      resourceId: id,
      metadata: {
        fromStatus: existing.status,
        createdById: existing.createdById,
        clientId: updated.clientId,
        expectedBudget: existing.expectedBudget?.toString() ?? null,
        agreedAmount,
        continuation,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    if (continuation) {
      try {
        const applied = await this.applyContinuation(id, existing, actor, {
          staffNotes: input.staffNotes,
          skipNotify: true,
        });
        const reopen = existing.type === "REOPEN_PROJECT";
        this.notifyCreator(applied, {
          title: reopen ? "Project reopened" : "Change request approved",
          body: reopen
            ? `Your request to reopen "${applied.targetProjectName ?? applied.title}" was approved. The existing project is active again.`
            : `Your ${existing.type.replaceAll("_", " ").toLowerCase()} request "${applied.title}" was approved and linked to the existing project. This is not financial or invoice approval.`,
        });
        return applied;
      } catch (error) {
        this.notifyCreator(updated, {
          title: "Change request approved",
          body: `Your change request "${updated.title}" was approved.`,
        });
        throw error;
      }
    }

    const convertInput: ConvertCustomerRequestInput = {
      createProject:
        existing.type !== "NEW_TASK" || !existing.targetProjectId,
      createTask: existing.type === "NEW_TASK",
      projectId: existing.targetProjectId,
      staffNotes: input.staffNotes,
    };

    try {
      const converted = await this.convert(id, convertInput, actor, {
        skipNotify: true,
      });
      if (
        (converted.type === "NEW_PROJECT" ||
          converted.type === "GENERAL_SERVICE") &&
        converted.convertedProjectId &&
        converted.agreedAmount != null
      ) {
        await quotesService.issueCustomerAdvanceTerms(
          {
            id: converted.id,
            title: converted.title,
            convertedProjectId: converted.convertedProjectId,
            agreedAmount: converted.agreedAmount,
            currency: converted.currency,
          },
          actor,
        );
      }
      this.notifyCreator(converted, {
        title: "Project Approved — Advance Payment Required",
        body: `Your request "${converted.title}" was approved. Final agreed deal amount: ${converted.currency} ${Number(converted.agreedAmount ?? converted.commercialAmount ?? 0).toFixed(2)}. Pay the required advance to start the project.`,
      });
      return converted;
    } catch (error) {
      this.notifyCreator(updated, {
        title: "Request approved",
        body: `Your work request "${updated.title}" was approved.`,
      });
      throw error;
    }
  }

  async reject(
    id: string,
    input: RejectCustomerRequestInput,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestDto> {
    this.assertIsReviewer(actor);
    const existing = await this.requireRequest(id);

    this.assertTransition(existing.status, "REJECTED", [
      "SUBMITTED",
      "UNDER_REVIEW",
      "CUSTOMER_RESPONDED",
    ]);

    const updated = await customerRequestsRepository.updateStatus(id, {
      status: "REJECTED",
      rejectionReason: input.reason,
      staffNotes: input.staffNotes,
      reviewedById: actor.userId,
      reviewedAt: new Date(),
    });

    await logCustomerRequestAuditEvent({
      userId: actor.userId,
      action: CUSTOMER_REQUEST_AUDIT_ACTIONS.REJECT,
      resourceId: id,
      metadata: { fromStatus: existing.status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    this.notifyCreator(updated, {
      title: "Request rejected",
      body: `Your work request "${updated.title}" was rejected: ${input.reason.substring(0, 180)}`,
    });

    return presentRequest(updated, actor);
  }

  async convert(
    id: string,
    input: ConvertCustomerRequestInput,
    actor: CustomerRequestActor,
    options?: { skipNotify?: boolean },
  ): Promise<CustomerRequestDto> {
    this.assertIsReviewer(actor);
    const existing = await this.requireRequest(id);

    if (existing.status !== "APPROVED") {
      throw new CustomerRequestsError(
        "Only approved requests can be converted",
        400,
        CUSTOMER_REQUESTS_ERROR_CODES.INVALID_TRANSITION,
      );
    }

    if (isCustomerRequestContinuationType(existing.type)) {
      return this.applyContinuation(id, existing, actor, {
        staffNotes: input.staffNotes,
        skipNotify: options?.skipNotify,
      });
    }

    await this.activateSubmittingCustomer(existing, actor);
    const linked = await this.requireRequest(id);

    const clientId = linked.clientId;
    if (!clientId) {
      throw new CustomerRequestsError(
        "Could not associate the submitting customer before conversion",
        400,
        CUSTOMER_REQUESTS_ERROR_CODES.VALIDATION_ERROR,
        [
          {
            field: "clientId",
            message: "Customer account could not be activated",
          },
        ],
      );
    }

    const { createProject, createTask, projectId } =
      this.resolveConvertFlags(linked, input);

    if (createTask && !projectId && !createProject) {
      throw new CustomerRequestsError(
        "A project is required to create a task. Provide projectId or enable createProject.",
        400,
        CUSTOMER_REQUESTS_ERROR_CODES.VALIDATION_ERROR,
        [{ field: "projectId", message: "Project is required for task creation" }],
      );
    }

    if (!createProject && !createTask) {
      throw new CustomerRequestsError(
        "Conversion must create a project and/or a task",
        400,
        CUSTOMER_REQUESTS_ERROR_CODES.VALIDATION_ERROR,
      );
    }

    const claimed = await customerRequestsRepository.claimForConversion(
      id,
      actor.userId,
      input.staffNotes,
    );

    if (!claimed) {
      throw new CustomerRequestsError(
        "Request was already converted",
        409,
        CUSTOMER_REQUESTS_ERROR_CODES.ALREADY_CONVERTED,
      );
    }

    const staffActor = {
      userId: actor.userId,
      role: actor.role,
      email: actor.email,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    };

    const description = combineConvertDescription(linked);
    const dueDate = dueDateString(linked.preferredDeadline);
    const budget = budgetString(linked.agreedAmount);

    let convertedProjectId: string | null = projectId;
    let convertedTaskId: string | null = null;

    try {
      if (createProject) {
        const projectInput: CreateProjectInput = {
          name: linked.title,
          description,
          clientId,
          status: "NOT_STARTED",
          priority: mapProjectPriority(linked.priority),
          startDate: "",
          dueDate,
          progress: 0,
          budget,
          memberIds: [],
          milestones: [],
          attachments: [],
        };

        const project = await projectsService.create(projectInput, staffActor);
        convertedProjectId = project.id;
      }

      if (createTask) {
        if (!convertedProjectId) {
          throw new CustomerRequestsError(
            "A project is required to create a task",
            400,
            CUSTOMER_REQUESTS_ERROR_CODES.VALIDATION_ERROR,
            [
              {
                field: "projectId",
                message: "Project is required for task creation",
              },
            ],
          );
        }

        const taskInput: CreateTaskInput = {
          title: linked.title,
          description,
          projectId: convertedProjectId,
          assignedToId: input.assignedToId ?? "",
          status: "TODO",
          priority: mapTaskPriority(linked.priority),
          labels: [],
          startDate: "",
          dueDate,
          progress: 0,
          estimatedHours: "",
          attachments: [],
        };

        const task = await tasksService.create(taskInput, staffActor);
        convertedTaskId = task.id;
      }

      const converted = await customerRequestsRepository.setConversionResults(
        id,
        {
          convertedProjectId,
          convertedTaskId,
        },
      );

      await logCustomerRequestAuditEvent({
        userId: actor.userId,
        action: CUSTOMER_REQUEST_AUDIT_ACTIONS.CONVERT,
        resourceId: id,
        metadata: {
          convertedProjectId,
          convertedTaskId,
          createProject,
          createTask,
          expectedBudget: linked.expectedBudget?.toString() ?? null,
          agreedAmount: linked.agreedAmount?.toString() ?? null,
          projectBudget: budget || null,
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });

      if (!options?.skipNotify) {
        this.notifyCreator(converted, {
          title: "Request converted",
          body: `Your work request "${converted.title}" was converted into delivery work.`,
        });
      }

      const dto = presentRequest(converted, actor);
      if (
        (dto.type === "NEW_PROJECT" || dto.type === "GENERAL_SERVICE") &&
        dto.convertedProjectId &&
        dto.agreedAmount != null
      ) {
        await quotesService.issueCustomerAdvanceTerms(
          {
            id: dto.id,
            title: dto.title,
            convertedProjectId: dto.convertedProjectId,
            agreedAmount: dto.agreedAmount,
            currency: dto.currency,
          },
          actor,
        );
      }

      return dto;
    } catch (error) {
      await customerRequestsRepository.revertConversionClaim(id);
      throw error;
    }
  }

  private async applyContinuation(
    id: string,
    existing: CustomerRequestWithRelations,
    actor: CustomerRequestActor,
    options?: { staffNotes?: string | null; skipNotify?: boolean },
  ): Promise<CustomerRequestDto> {
    const projectId = existing.targetProjectId;
    if (!projectId) {
      throw new CustomerRequestsError(
        "A linked project is required to apply this change request",
        400,
        CUSTOMER_REQUESTS_ERROR_CODES.VALIDATION_ERROR,
        [{ field: "targetProjectId", message: "Linked project is missing" }],
      );
    }

    const clientId = existing.clientId;
    if (clientId) {
      await this.requireClientProject(projectId, clientId);
    } else {
      await this.requireOwnedProject(projectId, {
        userId: existing.createdById,
        role: UserRole.CLIENT,
        email: actor.email,
        companyId: null,
      });
    }

    const claimed = await customerRequestsRepository.claimForConversion(
      id,
      actor.userId,
      options?.staffNotes,
    );

    if (!claimed) {
      throw new CustomerRequestsError(
        "Request was already converted",
        409,
        CUSTOMER_REQUESTS_ERROR_CODES.ALREADY_CONVERTED,
      );
    }

    try {
      if (existing.type === "REOPEN_PROJECT") {
        await projectsService.update(
          projectId,
          { status: "IN_PROGRESS" },
          {
            userId: actor.userId,
            role: actor.role,
            email: actor.email,
            ipAddress: actor.ipAddress,
            userAgent: actor.userAgent,
          },
        );
        await logProjectAuditEvent({
          userId: actor.userId,
          action: PROJECT_AUDIT_ACTIONS.REOPEN,
          resourceId: projectId,
          metadata: { requestId: id, fromRequestType: existing.type },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        });
      }

      const converted = await customerRequestsRepository.setConversionResults(
        id,
        {
          convertedProjectId: projectId,
          convertedTaskId: null,
        },
      );

      await logCustomerRequestAuditEvent({
        userId: actor.userId,
        action: CUSTOMER_REQUEST_AUDIT_ACTIONS.APPLY,
        resourceId: id,
        metadata: {
          convertedProjectId: projectId,
          type: existing.type,
          reopened: existing.type === "REOPEN_PROJECT",
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });

      if (!options?.skipNotify) {
        this.notifyCreator(converted, {
          title: "Change request applied",
          body: `Your change request "${converted.title}" was applied to the existing project.`,
        });
      }

      return presentRequest(converted, actor);
    } catch (error) {
      await customerRequestsRepository.revertConversionClaim(id);
      throw error;
    }
  }

  private async activateSubmittingCustomer(
    existing: CustomerRequestWithRelations,
    actor: CustomerRequestActor,
  ): Promise<string> {
    if (existing.clientId) {
      const submitter = await prisma.user.findFirst({
        where: { id: existing.createdById, deletedAt: null },
        select: {
          id: true,
          companyId: true,
          role: { select: { code: true } },
        },
      });
      if (
        submitter &&
        submitter.role.code === UserRole.CLIENT &&
        !submitter.companyId
      ) {
        await prisma.user.update({
          where: { id: submitter.id },
          data: { companyId: existing.clientId },
        });
      }
      return existing.clientId;
    }

    const link = await ensurePortalCompanyLink(existing.createdById, {
      userId: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    if (!link?.companyId) {
      throw new CustomerRequestsError(
        "Could not activate the submitting customer account",
        400,
        CUSTOMER_REQUESTS_ERROR_CODES.VALIDATION_ERROR,
      );
    }

    await customerRequestsRepository.associateUnlinkedRequestsForCreator(
      existing.createdById,
      link.companyId,
    );

    return link.companyId;
  }

  private resolveConvertFlags(
    request: CustomerRequestWithRelations,
    input: ConvertCustomerRequestInput,
  ): {
    createProject: boolean;
    createTask: boolean;
    projectId: string | null;
  } {
    const projectId = input.projectId ?? request.targetProjectId ?? null;

    if (request.type === "NEW_TASK") {
      const createProject = input.createProject === true;
      return {
        createProject,
        createTask: true,
        projectId,
      };
    }

    // NEW_PROJECT / GENERAL_SERVICE
    return {
      createProject: input.createProject ?? true,
      createTask: input.createTask === true,
      projectId,
    };
  }

  private async resolveScope(
    actor: CustomerRequestActor,
    _options: { requireLinked?: boolean } = {},
  ): Promise<CustomerRequestAccessScope> {
    if (isClient(actor)) {
      const companyId =
        actor.companyId !== undefined
          ? actor.companyId
          : await this.loadCompanyId(actor.userId);

      // Always scope to the authenticated requester. When linked, also include
      // company-owned requests. Never trust a client-supplied company id.
      return {
        all: false,
        createdById: actor.userId,
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

  private assertIsClient(actor: CustomerRequestActor): void {
    if (!isClient(actor)) {
      throw new CustomerRequestsError(
        "Only clients can perform this action",
        403,
        CUSTOMER_REQUESTS_ERROR_CODES.FORBIDDEN,
      );
    }
  }

  private assertIsReviewer(actor: CustomerRequestActor): void {
    if (!isAdmin(actor)) {
      throw new CustomerRequestsError(
        "Only administrators can review customer requests",
        403,
        CUSTOMER_REQUESTS_ERROR_CODES.FORBIDDEN,
      );
    }
  }

  private assertTransition(
    current: CustomerRequestStatusValue,
    next: CustomerRequestStatusValue,
    allowedFrom: CustomerRequestStatusValue[],
  ): void {
    if (!allowedFrom.includes(current)) {
      throw new CustomerRequestsError(
        `Cannot transition from ${current} to ${next}`,
        400,
        CUSTOMER_REQUESTS_ERROR_CODES.INVALID_TRANSITION,
      );
    }
  }

  private async requireRequest(
    id: string,
  ): Promise<CustomerRequestWithRelations> {
    const request = await customerRequestsRepository.findById(id, {
      all: true,
    });

    if (!request) {
      throw new CustomerRequestsError(
        "Customer request not found",
        404,
        CUSTOMER_REQUESTS_ERROR_CODES.NOT_FOUND,
      );
    }

    return request;
  }

  private async requireOwnedRequest(
    id: string,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestWithRelations> {
    const scope = await this.resolveScope(actor);
    const request = await customerRequestsRepository.findById(id, scope);

    if (!request) {
      throw new CustomerRequestsError(
        "Customer request not found",
        404,
        CUSTOMER_REQUESTS_ERROR_CODES.NOT_FOUND,
      );
    }

    return request;
  }

  private async requireOwnedProject(
    projectId: string,
    actor: CustomerRequestActor,
  ): Promise<{
    id: string;
    name: string;
    status: string;
    clientId: string | null;
  }> {
    const project = await customerRequestsRepository.findProjectOwnedByCustomer(
      projectId,
      actor.userId,
      actor.companyId ?? null,
    );

    if (!project) {
      throw new CustomerRequestsError(
        "This project was not found for your account",
        400,
        CUSTOMER_REQUESTS_ERROR_CODES.PROJECT_NOT_FOUND,
        [{ field: "targetProjectId", message: "Invalid target project" }],
      );
    }

    if (!actor.companyId && project.clientId) {
      await prisma.user.update({
        where: { id: actor.userId },
        data: { companyId: project.clientId },
      });
    }

    return project;
  }

  private async requireClientProject(
    projectId: string,
    clientId: string,
  ): Promise<{ id: string; name: string; status: string; clientId: string | null }> {
    const project = await customerRequestsRepository.findClientProject(
      projectId,
      clientId,
    );

    if (!project) {
      throw new CustomerRequestsError(
        "This project was not found for your account",
        400,
        CUSTOMER_REQUESTS_ERROR_CODES.PROJECT_NOT_FOUND,
        [{ field: "targetProjectId", message: "Invalid target project" }],
      );
    }

    return project;
  }

  private notifyStaffOnSubmit(
    request: CustomerRequestWithRelations,
    actor: CustomerRequestActor,
  ): void {
    const continuation = isCustomerRequestContinuationType(request.type);
    const fromClarification = request.status === "CUSTOMER_RESPONDED";
    const title = fromClarification
      ? "Customer responded to clarification"
      : continuation
        ? "New project change request"
        : "New customer work request";
    const typeLabel = request.type.replaceAll("_", " ").toLowerCase();
    const projectBit = request.targetProject?.name
      ? ` for ${request.targetProject.name}`
      : "";
    const body = fromClarification
      ? `${actor.email} responded on "${request.title}"`
      : `${actor.email} submitted a ${typeLabel} request "${request.title}"${projectBit}`;
    const linkUrl = `/customer-requests/${request.id}`;

    void notificationDispatcher.notify({
      title,
      body,
      category: NotificationCategory.PROJECT,
      priority: NotificationPriority.HIGH,
      linkUrl,
      entityType: "CustomerRequest",
      entityId: request.id,
      audience: { type: "ROLE", roleCode: "ADMIN" },
      createdById: actor.userId,
    });

    void notificationDispatcher.notify({
      title,
      body,
      category: NotificationCategory.PROJECT,
      priority: NotificationPriority.HIGH,
      linkUrl,
      entityType: "CustomerRequest",
      entityId: request.id,
      audience: { type: "ROLE", roleCode: "SUPER_ADMIN" },
      createdById: actor.userId,
    });

    this.notifyCreator(request, {
      title: fromClarification ? "Response submitted" : "Request submitted",
      body: fromClarification
        ? `Your response on "${request.title}" was sent to EliteFlow.`
        : `Your request "${request.title}" was submitted.`,
    });
  }

  private notifyCreator(
    request: { id: string; createdById: string },
    message: { title: string; body: string },
  ): void {
    void notificationDispatcher.notify({
      title: message.title,
      body: message.body,
      category: NotificationCategory.PROJECT,
      priority: NotificationPriority.HIGH,
      linkUrl: `/requests/${request.id}`,
      entityType: "CustomerRequest",
      entityId: request.id,
      audience: { type: "INDIVIDUAL", userId: request.createdById },
      createdById: null,
    });
  }
}

export const customerRequestsService = new CustomerRequestsService();
