import type { Prisma } from "@enterprise/database";
import type {
  CustomerRequestAttachmentDto,
  CustomerRequestDto,
  CustomerRequestPriorityValue,
  CustomerRequestStatusValue,
  CustomerRequestTypeValue,
} from "@enterprise/shared";
import { isCustomerRequestContinuationType } from "@enterprise/shared";

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

export type ClarificationHistoryEntry = {
  at: string;
  from: "admin" | "customer";
  message: string;
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
  agreedAmount: Prisma.Decimal | null;
  currency: string;
  priority: CustomerRequestPriorityValue;
  status: CustomerRequestStatusValue;
  additionalNotes: string | null;
  staffNotes: string | null;
  clarificationMessage: string | null;
  clarificationResponse: string | null;
  clarificationHistory: Prisma.JsonValue | null;
  rejectionReason: string | null;
  targetProjectId: string | null;
  parentRequestId: string | null;
  convertedProjectId: string | null;
  convertedTaskId: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  client?: { id: string; companyName: string } | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  reviewedBy?: { id: string; firstName: string; lastName: string } | null;
  targetProject?: { id: string; name: string; status?: string } | null;
  parentRequest?: { id: string; title: string } | null;
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

function commercialAmount(
  request: CustomerRequestWithRelations,
): number | null {
  if (request.agreedAmount != null) {
    return toBudgetNumber(request.agreedAmount);
  }
  // Continuation expected budget is not commercial approval (Phase 3).
  if (isCustomerRequestContinuationType(request.type)) {
    return null;
  }
  if (request.status === "APPROVED" || request.status === "CONVERTED") {
    return toBudgetNumber(request.expectedBudget);
  }
  return null;
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

function parseClarificationHistory(
  value: Prisma.JsonValue | null | undefined,
): ClarificationHistoryEntry[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const entries: ClarificationHistoryEntry[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const record = row as Record<string, unknown>;
    const from = record.from === "admin" || record.from === "customer"
      ? record.from
      : null;
    const message =
      typeof record.message === "string" ? record.message.trim() : "";
    const at = typeof record.at === "string" ? record.at : "";
    if (!from || !message || !at) continue;
    entries.push({ at, from, message });
  }

  return entries.length > 0 ? entries : [];
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
    createdByEmail: request.createdBy?.email ?? null,
    type: request.type,
    isContinuation: isCustomerRequestContinuationType(request.type),
    title: request.title,
    description: request.description,
    requirements: request.requirements,
    preferredDeadline: toDateOnly(request.preferredDeadline),
    expectedBudget: toBudgetNumber(request.expectedBudget),
    agreedAmount: toBudgetNumber(request.agreedAmount),
    commercialAmount: commercialAmount(request),
    currency: request.currency,
    priority: request.priority,
    status: request.status,
    additionalNotes: request.additionalNotes,
    staffNotes: request.staffNotes,
    clarificationMessage: request.clarificationMessage,
    clarificationResponse: request.clarificationResponse,
    clarificationHistory: parseClarificationHistory(request.clarificationHistory),
    rejectionReason: request.rejectionReason,
    targetProjectId: request.targetProjectId,
    targetProjectName: request.targetProject?.name ?? null,
    parentRequestId: request.parentRequestId,
    parentRequestTitle: request.parentRequest?.title ?? null,
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
