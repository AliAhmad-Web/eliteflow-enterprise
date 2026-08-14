import type { Prisma } from "@enterprise/database";
import type {
  CustomerRequestAttachmentDto,
  CustomerRequestDto,
  CustomerRequestPriorityValue,
  CustomerRequestStatusValue,
  CustomerRequestTypeValue,
} from "@enterprise/shared";

export type CustomerRequestAttachmentRecord = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number | null;
  managedFileId: string | null;
  uploadedById: string | null;
  createdAt: Date;
};

export type CustomerRequestWithRelations = {
  id: string;
  clientId: string | null;
  createdById: string;
  type: CustomerRequestTypeValue;
  title: string;
  description: string | null;
  requirements: string | null;
  preferredDeadline: Date | null;
  expectedBudget: Prisma.Decimal | null;
  currency: string;
  priority: CustomerRequestPriorityValue;
  status: CustomerRequestStatusValue;
  additionalNotes: string | null;
  staffNotes: string | null;
  clarificationMessage: string | null;
  rejectionReason: string | null;
  targetProjectId: string | null;
  convertedProjectId: string | null;
  convertedTaskId: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  client?: { id: string; companyName: string } | null;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  reviewedBy?: { id: string; firstName: string; lastName: string } | null;
  targetProject?: { id: string; name: string } | null;
  attachments?: CustomerRequestAttachmentRecord[];
};

function toDateOnly(value: Date | null): string | null {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(0, 10);
}

function toIso(value: Date | null): string | null {
  if (!value) {
    return null;
  }

  return value.toISOString();
}

function toBudgetNumber(value: Prisma.Decimal | null): number | null {
  if (value === null) {
    return null;
  }

  return Number(value);
}

function displayName(
  user: { firstName: string; lastName: string } | null | undefined,
): string | null {
  if (!user) {
    return null;
  }

  const name = `${user.firstName} ${user.lastName}`.trim();
  return name.length > 0 ? name : null;
}

function toAttachmentDto(
  attachment: CustomerRequestAttachmentRecord,
): CustomerRequestAttachmentDto {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    managedFileId: attachment.managedFileId,
    createdAt: attachment.createdAt.toISOString(),
  };
}

export function toCustomerRequestDto(
  request: CustomerRequestWithRelations,
): CustomerRequestDto {
  return {
    id: request.id,
    clientId: request.clientId,
    clientName: request.client?.companyName ?? null,
    createdById: request.createdById,
    createdByName: displayName(request.createdBy),
    type: request.type,
    title: request.title,
    description: request.description,
    requirements: request.requirements,
    preferredDeadline: toDateOnly(request.preferredDeadline),
    expectedBudget: toBudgetNumber(request.expectedBudget),
    currency: request.currency,
    priority: request.priority,
    status: request.status,
    additionalNotes: request.additionalNotes,
    staffNotes: request.staffNotes,
    clarificationMessage: request.clarificationMessage,
    rejectionReason: request.rejectionReason,
    targetProjectId: request.targetProjectId,
    targetProjectName: request.targetProject?.name ?? null,
    convertedProjectId: request.convertedProjectId,
    convertedTaskId: request.convertedTaskId,
    reviewedById: request.reviewedById,
    reviewedByName: displayName(request.reviewedBy),
    reviewedAt: toIso(request.reviewedAt),
    submittedAt: toIso(request.submittedAt),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    attachments: (request.attachments ?? []).map(toAttachmentDto),
  };
}

export type { CustomerRequestDto };
