"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CUSTOMER_REQUEST_INTAKE_TYPES,
  CUSTOMER_REQUEST_PRIORITIES,
  FILES_API_PREFIX,
  PERMISSIONS,
  createCustomerRequestSchema,
  isCustomerRequestContinuationType,
  type CreateCustomerRequestInput,
  type CustomerRequestAttachmentDto,
  type CustomerRequestDto,
  type CustomerRequestTypeValue,
  type Project,
} from "@enterprise/shared";
import { Loader2, Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/features/auth/components/form-field-error";
import { filesService } from "@/features/files/services/files.service";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { FORM_SELECT_CLASS_MD } from "@/lib/form-styles";
import { cn } from "@/lib/utils";
import { getApiBaseUrl, getApiErrorMessage } from "@/services/api/api-error";

import { useAddCustomerRequestAttachment } from "../hooks/use-customer-request-mutations";
import {
  CUSTOMER_REQUEST_PRIORITY_LABELS,
  CUSTOMER_REQUEST_TYPE_LABELS,
} from "../types/query-keys";

const selectClassName = FORM_SELECT_CLASS_MD;

type PendingAttachment = {
  fileName: string;
  fileUrl: string;
  managedFileId: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

export type RequestFormValues = CreateCustomerRequestInput;

interface RequestFormProps {
  mode: "create" | "edit";
  /** When editing an existing request, uploads attach immediately via API. */
  requestId?: string;
  initialValues?: CustomerRequestDto | null;
  defaultType?: CustomerRequestTypeValue;
  /** Restrict selectable types (defaults to Phase 1 intake types). */
  allowedTypes?: readonly CustomerRequestTypeValue[];
  /** When set, the request is bound to this project and the selector is hidden. */
  lockedProject?: { id: string; name: string } | null;
  projects: Project[];
  isSubmitting?: boolean;
  onSubmit: (
    values: RequestFormValues,
    options: { submit: boolean },
  ) => Promise<void> | void;
  onCancel: () => void;
  className?: string;
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function toFormValues(
  request?: CustomerRequestDto | null,
  defaultType?: CustomerRequestTypeValue,
  lockedProjectId?: string | null,
): RequestFormValues {
  return {
    type: request?.type ?? defaultType ?? "NEW_PROJECT",
    title: request?.title ?? "",
    description: request?.description ?? "",
    requirements: request?.requirements ?? "",
    preferredDeadline: toDateInputValue(request?.preferredDeadline),
    expectedBudget:
      request?.expectedBudget != null ? String(request.expectedBudget) : "",
    currency: request?.currency ?? "USD",
    priority: request?.priority ?? "MEDIUM",
    additionalNotes: request?.additionalNotes ?? "",
    targetProjectId:
      lockedProjectId ?? request?.targetProjectId ?? "",
    submit: false,
  };
}

export function RequestForm({
  mode,
  requestId,
  initialValues,
  defaultType,
  allowedTypes = CUSTOMER_REQUEST_INTAKE_TYPES,
  lockedProject = null,
  projects,
  isSubmitting = false,
  onSubmit,
  onCancel,
  className,
}: RequestFormProps) {
  const canUpload = useHasPermission(PERMISSIONS.FILES_UPLOAD);
  const addAttachmentMutation = useAddCustomerRequestAttachment();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const [existingAttachments, setExistingAttachments] = useState<
    CustomerRequestAttachmentDto[]
  >(initialValues?.attachments ?? []);
  const [uploading, setUploading] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(createCustomerRequestSchema),
    defaultValues: toFormValues(
      initialValues,
      defaultType,
      lockedProject?.id,
    ),
  });

  const requestType = watch("type");
  const continuation = isCustomerRequestContinuationType(requestType);

  useEffect(() => {
    reset(toFormValues(initialValues, defaultType, lockedProject?.id));
    setExistingAttachments(initialValues?.attachments ?? []);
    setPendingAttachments([]);
    setAttachError(null);
  }, [initialValues, defaultType, lockedProject?.id, reset]);

  async function handleAttachFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setAttachError(null);

    if (!canUpload) {
      setAttachError("File upload permission is required to attach files.");
      return;
    }

    setUploading(true);
    try {
      for (const file of [...fileList]) {
        const uploaded = await filesService.uploadFiles({ files: [file] });
        const managed = uploaded[0];
        if (!managed) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        const attachment: PendingAttachment = {
          fileName: managed.originalName || managed.name || file.name,
          fileUrl: `${getApiBaseUrl()}${FILES_API_PREFIX}/${managed.id}/download`,
          managedFileId: managed.id,
          mimeType: managed.mimeType ?? file.type,
          sizeBytes: managed.sizeBytes ?? file.size,
        };

        if (mode === "edit" && requestId) {
          const updated = await addAttachmentMutation.mutateAsync({
            id: requestId,
            input: attachment,
          });
          setExistingAttachments(updated.attachments);
        } else {
          setPendingAttachments((prev) => [...prev, attachment]);
        }
      }
    } catch (error) {
      setAttachError(getApiErrorMessage(error));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const submitValues = async (values: RequestFormValues, submit: boolean) => {
    if (uploading) {
      setAttachError("Wait for uploads to finish before saving.");
      return;
    }

    const payload: RequestFormValues = {
      ...values,
      description: values.description || null,
      requirements: values.requirements || null,
      preferredDeadline: values.preferredDeadline || null,
      expectedBudget:
        mode === "edit" && initialValues?.status !== "DRAFT"
          ? undefined
          : values.expectedBudget || null,
      additionalNotes: values.additionalNotes || null,
      targetProjectId: lockedProject
        ? lockedProject.id
        : values.type === "NEW_TASK"
          ? values.targetProjectId || null
          : isCustomerRequestContinuationType(values.type)
            ? values.targetProjectId || null
            : null,
      attachments:
        mode === "create" && pendingAttachments.length > 0
          ? pendingAttachments
          : undefined,
      submit,
    };
    await onSubmit(payload, { submit });
  };

  const busy = isSubmitting || uploading || addAttachmentMutation.isPending;

  return (
    <form
      className={cn("space-y-6", className)}
      noValidate
      onSubmit={handleSubmit(async (values) => {
        await submitValues(values, false);
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="request-type" required>
            Request type
          </Label>
          <select
            id="request-type"
            className={selectClassName}
            {...register("type")}
            onChange={(event) => {
              const next = event.target.value as CustomerRequestTypeValue;
              setValue("type", next, {
                shouldDirty: true,
                shouldValidate: true,
              });
              if (lockedProject) {
                setValue("targetProjectId", lockedProject.id, {
                  shouldDirty: true,
                });
              } else if (next !== "NEW_TASK") {
                setValue("targetProjectId", "", { shouldDirty: true });
              }
            }}
          >
            {allowedTypes.map((type) => (
              <option key={type} value={type}>
                {CUSTOMER_REQUEST_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <FormFieldError message={errors.type?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="request-priority" required>
            Priority
          </Label>
          <select
            id="request-priority"
            className={selectClassName}
            {...register("priority")}
          >
            {CUSTOMER_REQUEST_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {CUSTOMER_REQUEST_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
          <FormFieldError message={errors.priority?.message} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="request-title" required>
            Title
          </Label>
          <Input
            id="request-title"
            error={Boolean(errors.title)}
            {...register("title")}
          />
          <FormFieldError message={errors.title?.message} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="request-description">Description</Label>
          <Textarea
            id="request-description"
            rows={4}
            {...register("description")}
          />
          <FormFieldError message={errors.description?.message} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="request-requirements">Requirements</Label>
          <Textarea
            id="request-requirements"
            rows={5}
            placeholder="Scope, deliverables, constraints…"
            {...register("requirements")}
          />
          <FormFieldError message={errors.requirements?.message} />
        </div>

        {lockedProject ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="request-locked-project">Project</Label>
            <Input
              id="request-locked-project"
              value={lockedProject.name}
              readOnly
              disabled
            />
            <p className="text-xs text-muted-foreground">
              This change request stays attached to this project. You do not
              need to select a project.
            </p>
          </div>
        ) : requestType === "NEW_TASK" ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="request-target-project">
              Target project (optional)
            </Label>
            <select
              id="request-target-project"
              className={selectClassName}
              {...register("targetProjectId")}
            >
              <option value="">No specific project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <FormFieldError message={errors.targetProjectId?.message} />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="request-deadline">Preferred deadline</Label>
          <Input
            id="request-deadline"
            type="date"
            {...register("preferredDeadline")}
          />
          <FormFieldError message={errors.preferredDeadline?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="request-budget">Expected budget</Label>
          <Input
            id="request-budget"
            inputMode="decimal"
            placeholder="0.00"
            disabled={mode === "edit" && initialValues?.status !== "DRAFT"}
            {...register("expectedBudget")}
          />
          {continuation ? (
            <p className="text-xs text-muted-foreground">
              Optional. Approving this change request is not financial or
              invoice approval.
            </p>
          ) : mode === "edit" && initialValues?.status !== "DRAFT" ? (
            <p className="text-xs text-muted-foreground">
              The original expected budget is kept for history. The final deal
              amount is set by EliteFlow at approval.
            </p>
          ) : (
            <FormFieldError message={errors.expectedBudget?.message} />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="request-currency">Currency</Label>
          <Input
            id="request-currency"
            maxLength={3}
            placeholder="USD"
            {...register("currency")}
          />
          <FormFieldError message={errors.currency?.message} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="request-notes">
            {continuation ? "Reason / context" : "Additional notes"}
          </Label>
          <Textarea id="request-notes" rows={3} {...register("additionalNotes")} />
          <FormFieldError message={errors.additionalNotes?.message} />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Attachments</p>
            <p className="text-xs text-muted-foreground">
              Files upload through File Manager security and stay scoped to your
              account.
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(event) => void handleAttachFiles(event.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || !canUpload}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden />
              ) : (
                <Paperclip className="mr-2 size-3.5" aria-hidden />
              )}
              {uploading ? "Uploading…" : "Attach files"}
            </Button>
          </div>
        </div>

        {!canUpload ? (
          <p className="text-xs text-muted-foreground">
            File upload permission is required to attach documents.
          </p>
        ) : null}

        {existingAttachments.length > 0 || pendingAttachments.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {existingAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs"
              >
                <Paperclip className="size-3 text-muted-foreground" />
                <span className="max-w-40 truncate">{attachment.fileName}</span>
              </div>
            ))}
            {pendingAttachments.map((attachment) => (
              <div
                key={attachment.managedFileId}
                className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs"
              >
                <Paperclip className="size-3 text-muted-foreground" />
                <span className="max-w-40 truncate">{attachment.fileName}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${attachment.fileName}`}
                  onClick={() =>
                    setPendingAttachments((prev) =>
                      prev.filter(
                        (item) => item.managedFileId !== attachment.managedFileId,
                      ),
                    )
                  }
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No attachments yet.</p>
        )}

        {attachError ? (
          <p className="text-sm text-destructive" role="alert">
            {attachError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {mode === "create" ? (
          <>
            <Button type="submit" variant="secondary" disabled={busy}>
              Save draft
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={handleSubmit(async (values) => {
                await submitValues(values, true);
              })}
            >
              Submit request
            </Button>
          </>
        ) : (
          <Button type="submit" disabled={busy}>
            Save changes
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
