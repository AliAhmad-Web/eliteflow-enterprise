import {
  Prisma,
  prisma,
  type CustomerRequestStatus,
  type CustomerRequestPriority,
  type CustomerRequestType,
} from "@enterprise/database";
import type {
  CreateCustomerRequestInput,
  ListCustomerRequestsQueryInput,
  UpdateCustomerRequestInput,
} from "@enterprise/shared";

import type { CustomerRequestWithRelations } from "./customer-requests.types.js";

const requestInclude = {
  client: { select: { id: true, companyName: true } },
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  reviewedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  targetProject: { select: { id: true, name: true } },
  attachments: {
    orderBy: { createdAt: "asc" as const },
  },
} as const;

const SORT_FIELD_MAP = {
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  preferredDeadline: "preferredDeadline",
  priority: "priority",
  status: "status",
  title: "title",
} as const;

function emptyToNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return value.trim().length === 0 ? null : value.trim();
}

function parseOptionalDate(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value.trim().length === 0) {
    return null;
  }

  return new Date(value);
}

function parseOptionalBudget(
  value: string | null | undefined,
): Prisma.Decimal | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value.trim().length === 0) {
    return null;
  }

  return new Prisma.Decimal(value);
}

export interface CustomerRequestAccessScope {
  /** Unrestricted for staff */
  all: boolean;
  /**
   * Client portal company scope — requests for their linked Client row.
   * Combined with createdById via OR when both are present.
   */
  clientCompanyId?: string | null;
  /**
   * Always set for CLIENT actors so unlinked onboarding requests
   * (null clientId) remain visible/editable only to the requester.
   */
  createdById?: string | null;
}

export type SecuredAttachmentInput = {
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  managedFileId?: string | null;
};

export type CreateCustomerRequestData = Omit<
  CreateCustomerRequestInput,
  "attachments" | "submit" | "expectedBudget" | "preferredDeadline" | "targetProjectId"
> & {
  /** Null while requester is still unlinked / onboarding. */
  clientId: string | null;
  createdById: string;
  status: CustomerRequestStatus;
  submittedAt?: Date | null;
  preferredDeadline?: string | null;
  expectedBudget?: string | null;
  targetProjectId?: string | null;
  attachments?: SecuredAttachmentInput[];
};

export class CustomerRequestsRepository {
  async findMany(
    query: ListCustomerRequestsQueryInput,
    scope: CustomerRequestAccessScope,
  ): Promise<{ items: CustomerRequestWithRelations[]; total: number }> {
    const where = this.buildWhere(query, scope);
    const sortField = SORT_FIELD_MAP[query.sortBy];
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      prisma.customerRequest.findMany({
        where,
        include: requestInclude,
        orderBy: { [sortField]: query.sortOrder },
        skip,
        take: query.limit,
      }),
      prisma.customerRequest.count({ where }),
    ]);

    return { items: items as unknown as CustomerRequestWithRelations[], total };
  }

  async findById(
    id: string,
    scope: CustomerRequestAccessScope,
  ): Promise<CustomerRequestWithRelations | null> {
    const request = await prisma.customerRequest.findFirst({
      where: {
        id,
        deletedAt: null,
        ...this.scopeFilter(scope),
      },
      include: requestInclude,
    });

    return request as unknown as CustomerRequestWithRelations | null;
  }

  async create(
    data: CreateCustomerRequestData,
  ): Promise<CustomerRequestWithRelations> {
    const created = await prisma.customerRequest.create({
      data: {
        clientId: data.clientId,
        createdById: data.createdById,
        type: data.type as CustomerRequestType,
        title: data.title,
        description: emptyToNull(data.description) ?? null,
        requirements: emptyToNull(data.requirements) ?? null,
        preferredDeadline: parseOptionalDate(data.preferredDeadline) ?? null,
        expectedBudget: parseOptionalBudget(data.expectedBudget) ?? null,
        currency: data.currency ?? "USD",
        priority: (data.priority ?? "MEDIUM") as CustomerRequestPriority,
        status: data.status,
        additionalNotes: emptyToNull(data.additionalNotes) ?? null,
        targetProjectId: emptyToNull(data.targetProjectId) ?? null,
        submittedAt: data.submittedAt ?? null,
        attachments: data.attachments?.length
          ? {
              create: data.attachments.map((attachment) => ({
                fileName: attachment.fileName,
                fileUrl: attachment.fileUrl,
                mimeType: emptyToNull(attachment.mimeType) ?? null,
                sizeBytes: attachment.sizeBytes ?? null,
                managedFileId: attachment.managedFileId ?? null,
                uploadedById: data.createdById,
              })),
            }
          : undefined,
      },
      include: requestInclude,
    });

    return created as unknown as CustomerRequestWithRelations;
  }

  async associateClient(
    id: string,
    clientId: string,
  ): Promise<CustomerRequestWithRelations> {
    const updated = await prisma.customerRequest.update({
      where: { id },
      data: { clientId },
      include: requestInclude,
    });

    return updated as unknown as CustomerRequestWithRelations;
  }

  /** Backfill onboarding requests when a portal user is linked to a company. */
  async associateUnlinkedRequestsForCreator(
    createdById: string,
    clientId: string,
  ): Promise<number> {
    const result = await prisma.customerRequest.updateMany({
      where: {
        createdById,
        clientId: null,
        deletedAt: null,
      },
      data: { clientId },
    });

    return result.count;
  }

  async update(
    id: string,
    input: UpdateCustomerRequestInput,
  ): Promise<CustomerRequestWithRelations> {
    const data: Record<string, unknown> = {};

    if (input.type !== undefined) data.type = input.type;
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) {
      data.description = emptyToNull(input.description) ?? null;
    }
    if (input.requirements !== undefined) {
      data.requirements = emptyToNull(input.requirements) ?? null;
    }
    if (input.preferredDeadline !== undefined) {
      data.preferredDeadline = parseOptionalDate(input.preferredDeadline) ?? null;
    }
    if (input.expectedBudget !== undefined) {
      data.expectedBudget = parseOptionalBudget(input.expectedBudget) ?? null;
    }
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.additionalNotes !== undefined) {
      data.additionalNotes = emptyToNull(input.additionalNotes) ?? null;
    }
    if (input.targetProjectId !== undefined) {
      data.targetProjectId = emptyToNull(input.targetProjectId) ?? null;
    }

    const updated = await prisma.customerRequest.update({
      where: { id },
      data,
      include: requestInclude,
    });

    return updated as unknown as CustomerRequestWithRelations;
  }

  async updateStatus(
    id: string,
    data: {
      status: CustomerRequestStatus;
      submittedAt?: Date | null;
      staffNotes?: string | null;
      clarificationMessage?: string | null;
      rejectionReason?: string | null;
      reviewedById?: string | null;
      reviewedAt?: Date | null;
      convertedProjectId?: string | null;
      convertedTaskId?: string | null;
    },
  ): Promise<CustomerRequestWithRelations> {
    const updated = await prisma.customerRequest.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.submittedAt !== undefined
          ? { submittedAt: data.submittedAt }
          : {}),
        ...(data.staffNotes !== undefined
          ? { staffNotes: emptyToNull(data.staffNotes) ?? null }
          : {}),
        ...(data.clarificationMessage !== undefined
          ? {
              clarificationMessage:
                emptyToNull(data.clarificationMessage) ?? null,
            }
          : {}),
        ...(data.rejectionReason !== undefined
          ? { rejectionReason: emptyToNull(data.rejectionReason) ?? null }
          : {}),
        ...(data.reviewedById !== undefined
          ? { reviewedById: data.reviewedById }
          : {}),
        ...(data.reviewedAt !== undefined
          ? { reviewedAt: data.reviewedAt }
          : {}),
        ...(data.convertedProjectId !== undefined
          ? { convertedProjectId: data.convertedProjectId }
          : {}),
        ...(data.convertedTaskId !== undefined
          ? { convertedTaskId: data.convertedTaskId }
          : {}),
      },
      include: requestInclude,
    });

    return updated as unknown as CustomerRequestWithRelations;
  }

  /**
   * Optimistic conversion guard — only transitions APPROVED → CONVERTED.
   * Returns false when another conversion already won the race.
   */
  async markConverted(
    id: string,
    data: {
      convertedProjectId: string | null;
      convertedTaskId: string | null;
      staffNotes?: string | null;
      reviewedById: string;
    },
    tx: Prisma.TransactionClient = prisma,
  ): Promise<boolean> {
    const result = await tx.customerRequest.updateMany({
      where: {
        id,
        status: "APPROVED",
        deletedAt: null,
      },
      data: {
        status: "CONVERTED",
        convertedProjectId: data.convertedProjectId,
        convertedTaskId: data.convertedTaskId,
        reviewedById: data.reviewedById,
        reviewedAt: new Date(),
        ...(data.staffNotes !== undefined
          ? { staffNotes: emptyToNull(data.staffNotes) ?? null }
          : {}),
      },
    });

    return result.count > 0;
  }

  /** Optimistic claim before creating delivery entities (prevents double convert). */
  async claimForConversion(
    id: string,
    reviewedById: string,
    staffNotes?: string | null,
  ): Promise<boolean> {
    const result = await prisma.customerRequest.updateMany({
      where: {
        id,
        status: "APPROVED",
        deletedAt: null,
      },
      data: {
        status: "CONVERTED",
        reviewedById,
        reviewedAt: new Date(),
        ...(staffNotes !== undefined
          ? { staffNotes: emptyToNull(staffNotes) ?? null }
          : {}),
      },
    });

    return result.count > 0;
  }

  async setConversionResults(
    id: string,
    data: {
      convertedProjectId: string | null;
      convertedTaskId: string | null;
    },
  ): Promise<CustomerRequestWithRelations> {
    const updated = await prisma.customerRequest.update({
      where: { id },
      data: {
        convertedProjectId: data.convertedProjectId,
        convertedTaskId: data.convertedTaskId,
      },
      include: requestInclude,
    });

    return updated as unknown as CustomerRequestWithRelations;
  }

  /** Revert a claimed conversion if delivery creation fails. */
  async revertConversionClaim(id: string): Promise<void> {
    await prisma.customerRequest.updateMany({
      where: {
        id,
        status: "CONVERTED",
        convertedProjectId: null,
        convertedTaskId: null,
        deletedAt: null,
      },
      data: {
        status: "APPROVED",
      },
    });
  }

  async addAttachment(
    requestId: string,
    input: SecuredAttachmentInput,
    uploadedById: string,
  ): Promise<CustomerRequestWithRelations> {
    await prisma.customerRequestAttachment.create({
      data: {
        requestId,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        mimeType: emptyToNull(input.mimeType) ?? null,
        sizeBytes: input.sizeBytes ?? null,
        managedFileId: input.managedFileId ?? null,
        uploadedById,
      },
    });

    const request = await this.findById(requestId, { all: true });
    if (!request) {
      throw new Error("Customer request not found after attaching file");
    }

    return request;
  }

  async projectBelongsToClient(
    projectId: string,
    clientId: string,
  ): Promise<boolean> {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        clientId,
        deletedAt: null,
      },
      select: { id: true },
    });

    return Boolean(project);
  }

  private buildWhere(
    query: ListCustomerRequestsQueryInput,
    scope: CustomerRequestAccessScope,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      ...this.scopeFilter(scope),
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { requirements: { contains: search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private scopeFilter(
    scope: CustomerRequestAccessScope,
  ): Record<string, unknown> {
    if (scope.all) {
      return {};
    }

    const clauses: Record<string, unknown>[] = [];
    if (scope.createdById) {
      clauses.push({ createdById: scope.createdById });
    }
    if (scope.clientCompanyId) {
      clauses.push({ clientId: scope.clientCompanyId });
    }

    if (clauses.length === 0) {
      // Defensive: no CLIENT identity → match nothing
      return { id: "00000000-0000-0000-0000-000000000000" };
    }

    if (clauses.length === 1) {
      return clauses[0]!;
    }

    return { OR: clauses };
  }
}

export const customerRequestsRepository = new CustomerRequestsRepository();
