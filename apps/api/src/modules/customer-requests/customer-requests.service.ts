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
} from "@enterprise/shared";

import { attachmentSecurityService } from "../files/attachment-security.service.js";
import { notificationDispatcher } from "../notifications/notification.dispatcher.js";
import { projectsService } from "../projects/projects.service.js";
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
]);

function isAdmin(actor: CustomerRequestActor): boolean {
  return (
    actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN
  );
}

function isClient(actor: CustomerRequestActor): boolean {
  return actor.role === UserRole.CLIENT;
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
      items: items.map(toCustomerRequestDto),
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

    return toCustomerRequestDto(request);
  }

  async create(
    input: CreateCustomerRequestInput,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestDto> {
    this.assertIsClient(actor);
    const clientId = actor.companyId ?? null;

    if (input.targetProjectId) {
      if (!clientId) {
        throw new CustomerRequestsError(
          "Link your company account before attaching an existing project",
          403,
          CUSTOMER_REQUESTS_ERROR_CODES.UNLINKED,
          [
            {
              field: "targetProjectId",
              message: "Company link required for target projects",
            },
          ],
        );
      }
      await this.assertTargetProject(input.targetProjectId, clientId);
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
      targetProjectId: input.targetProjectId,
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

    return toCustomerRequestDto(created);
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

    if (input.targetProjectId) {
      if (!clientId) {
        throw new CustomerRequestsError(
          "Link your company account before attaching an existing project",
          403,
          CUSTOMER_REQUESTS_ERROR_CODES.UNLINKED,
          [
            {
              field: "targetProjectId",
              message: "Company link required for target projects",
            },
          ],
        );
      }
      await this.assertTargetProject(input.targetProjectId, clientId);
    }

    const reply =
      typeof input.clarificationResponse === "string"
        ? input.clarificationResponse.trim()
        : "";
    const clarificationHistory =
      existing.status === "CLARIFICATION_REQUESTED" && reply
        ? upsertCustomerReply(existing.clarificationHistory, reply)
        : undefined;

    const updated = await customerRequestsRepository.update(id, input, {
      clarificationHistory,
    });

    await logCustomerRequestAuditEvent({
      userId: actor.userId,
      action: CUSTOMER_REQUEST_AUDIT_ACTIONS.UPDATE,
      resourceId: id,
      metadata: {
        fields: Object.keys(input),
        clarificationReply: Boolean(reply),
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toCustomerRequestDto(updated);
  }

  async submit(
    id: string,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestDto> {
    this.assertIsClient(actor);
    const existing = await this.requireOwnedRequest(id, actor);

    this.assertTransition(existing.status, "SUBMITTED", [
      "DRAFT",
      "CLARIFICATION_REQUESTED",
    ]);

    const updated = await customerRequestsRepository.updateStatus(id, {
      status: "SUBMITTED",
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

    return toCustomerRequestDto(updated);
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

    return toCustomerRequestDto(updated);
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

    return toCustomerRequestDto(updated);
  }

  async startReview(
    id: string,
    input: StartCustomerRequestReviewInput,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestDto> {
    this.assertIsReviewer(actor);
    const existing = await this.requireRequest(id);

    this.assertTransition(existing.status, "UNDER_REVIEW", ["SUBMITTED"]);

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

    return toCustomerRequestDto(updated);
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

    return toCustomerRequestDto(updated);
  }

  async approve(
    id: string,
    input: ApproveCustomerRequestInput,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestDto> {
    this.assertIsReviewer(actor);
    const existing = await this.requireRequest(id);

    this.assertTransition(existing.status, "APPROVED", ["UNDER_REVIEW"]);

    const updated = await customerRequestsRepository.updateStatus(id, {
      status: "APPROVED",
      staffNotes: input.staffNotes,
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
        clientId: existing.clientId,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    this.notifyCreator(updated, {
      title: "Request approved",
      body: `Your work request "${updated.title}" was approved.`,
    });

    return toCustomerRequestDto(updated);
  }

  async reject(
    id: string,
    input: RejectCustomerRequestInput,
    actor: CustomerRequestActor,
  ): Promise<CustomerRequestDto> {
    this.assertIsReviewer(actor);
    const existing = await this.requireRequest(id);

    this.assertTransition(existing.status, "REJECTED", ["UNDER_REVIEW"]);

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

    return toCustomerRequestDto(updated);
  }

  async convert(
    id: string,
    input: ConvertCustomerRequestInput,
    actor: CustomerRequestActor,
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

    if (!existing.clientId) {
      throw new CustomerRequestsError(
        "Associate a Client/Company account before converting this request",
        400,
        CUSTOMER_REQUESTS_ERROR_CODES.VALIDATION_ERROR,
        [
          {
            field: "clientId",
            message: "Client company is required before conversion",
          },
        ],
      );
    }

    const { createProject, createTask, projectId } =
      this.resolveConvertFlags(existing, input);

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

    const description = combineConvertDescription(existing);
    const dueDate = dueDateString(existing.preferredDeadline);
    const budget = budgetString(existing.expectedBudget);

    let convertedProjectId: string | null = projectId;
    let convertedTaskId: string | null = null;

    try {
      if (createProject) {
        const projectInput: CreateProjectInput = {
          name: existing.title,
          description,
          clientId: existing.clientId!,
          status: "NOT_STARTED",
          priority: mapProjectPriority(existing.priority),
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
          title: existing.title,
          description,
          projectId: convertedProjectId,
          assignedToId: input.assignedToId ?? "",
          status: "TODO",
          priority: mapTaskPriority(existing.priority),
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
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });

      this.notifyCreator(converted, {
        title: "Request converted",
        body: `Your work request "${converted.title}" was converted into delivery work.`,
      });

      return toCustomerRequestDto(converted);
    } catch (error) {
      await customerRequestsRepository.revertConversionClaim(id);
      throw error;
    }
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

  private async assertTargetProject(
    projectId: string,
    clientId: string,
  ): Promise<void> {
    const ok = await customerRequestsRepository.projectBelongsToClient(
      projectId,
      clientId,
    );

    if (!ok) {
      throw new CustomerRequestsError(
        "Target project was not found for your company",
        400,
        CUSTOMER_REQUESTS_ERROR_CODES.PROJECT_NOT_FOUND,
        [{ field: "targetProjectId", message: "Invalid target project" }],
      );
    }
  }

  private notifyStaffOnSubmit(
    request: CustomerRequestWithRelations,
    actor: CustomerRequestActor,
  ): void {
    const title = "New customer work request";
    const body = `${actor.email} submitted "${request.title}"`;
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
  }

  private notifyCreator(
    request: CustomerRequestWithRelations,
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
