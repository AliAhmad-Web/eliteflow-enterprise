"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  MILESTONE_STATUSES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  createProjectSchema,
  type Client,
  type CreateProjectInput,
  type Project,
} from "@enterprise/shared";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/features/auth/components/form-field-error";
import { FORM_SELECT_CLASS_MD } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

import type { ProjectAssigneeOption } from "../types/projects.types";
import {
  MILESTONE_STATUS_LABELS,
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
} from "../types/projects.types";

const selectClassName = FORM_SELECT_CLASS_MD;

interface ProjectFormProps {
  mode: "create" | "edit";
  initialValues?: Project | null;
  clients: Client[];
  assignees: ProjectAssigneeOption[];
  isSubmitting?: boolean;
  onSubmit: (values: CreateProjectInput) => Promise<void> | void;
  onCancel: () => void;
  className?: string;
}

function toFormValues(project?: Project | null): CreateProjectInput {
  return {
    name: project?.name ?? "",
    description: project?.description ?? "",
    clientId: project?.clientId ?? "",
    status: project?.status ?? "NOT_STARTED",
    priority: project?.priority ?? "MEDIUM",
    startDate: project?.startDate ?? "",
    dueDate: project?.dueDate ?? "",
    progress: project?.progress ?? 0,
    budget: project?.budget != null ? String(project.budget) : "",
    memberIds: project?.members.map((member) => member.userId) ?? [],
    milestones:
      project?.milestones.map((milestone) => ({
        title: milestone.title,
        description: milestone.description ?? "",
        dueDate: milestone.dueDate ?? "",
        status: milestone.status,
        sortOrder: milestone.sortOrder,
      })) ?? [],
    attachments:
      project?.attachments.map((attachment) => ({
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        mimeType: attachment.mimeType ?? "",
        sizeBytes: attachment.sizeBytes,
      })) ?? [],
  };
}

export function ProjectForm({
  mode,
  initialValues,
  clients,
  assignees,
  isSubmitting = false,
  onSubmit,
  onCancel,
  className,
}: ProjectFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: toFormValues(initialValues),
  });

  const milestonesArray = useFieldArray({ control, name: "milestones" });
  const attachmentsArray = useFieldArray({ control, name: "attachments" });
  const memberIds = watch("memberIds") ?? [];

  useEffect(() => {
    reset(toFormValues(initialValues));
  }, [initialValues, reset]);

  const toggleMember = (userId: string) => {
    const next = memberIds.includes(userId)
      ? memberIds.filter((id) => id !== userId)
      : [...memberIds, userId];
    setValue("memberIds", next, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <form
      className={cn("space-y-6", className)}
      noValidate
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="project-name" required>
            Project name
          </Label>
          <Input
            id="project-name"
            error={Boolean(errors.name)}
            {...register("name")}
          />
          <FormFieldError message={errors.name?.message} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="project-description">Description</Label>
          <Textarea
            id="project-description"
            rows={3}
            {...register("description")}
          />
          <FormFieldError message={errors.description?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-client">Client</Label>
          <select
            id="project-client"
            className={selectClassName}
            {...register("clientId")}
          >
            <option value="">Unassigned</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.companyName}
              </option>
            ))}
          </select>
          <FormFieldError message={errors.clientId?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-budget">Budget</Label>
          <Input
            id="project-budget"
            inputMode="decimal"
            placeholder="0.00"
            {...register("budget")}
          />
          <FormFieldError message={errors.budget?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-status" required>
            Status
          </Label>
          <select
            id="project-status"
            className={selectClassName}
            {...register("status")}
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <FormFieldError message={errors.status?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-priority" required>
            Priority
          </Label>
          <select
            id="project-priority"
            className={selectClassName}
            {...register("priority")}
          >
            {PROJECT_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PROJECT_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
          <FormFieldError message={errors.priority?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-start">Start date</Label>
          <Input id="project-start" type="date" {...register("startDate")} />
          <FormFieldError message={errors.startDate?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-due">Due date</Label>
          <Input id="project-due" type="date" {...register("dueDate")} />
          <FormFieldError message={errors.dueDate?.message} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="project-progress">Progress (%)</Label>
          <Input
            id="project-progress"
            type="number"
            min={0}
            max={100}
            {...register("progress", { valueAsNumber: true })}
          />
          <FormFieldError message={errors.progress?.message} />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-foreground">Team members</h4>
          <p className="text-xs text-muted-foreground">
            Assign internal users who can view and deliver this project.
          </p>
        </div>
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border/50 p-3">
          {assignees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignees available.</p>
          ) : (
            assignees.map((user) => {
              const checked = memberIds.includes(user.id);
              return (
                <label
                  key={user.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent/40"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={checked}
                    onChange={() => toggleMember(user.id)}
                  />
                  <span className="text-sm text-foreground">
                    {user.firstName} {user.lastName}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                </label>
              );
            })
          )}
        </div>
        <FormFieldError message={errors.memberIds?.message} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-medium text-foreground">Milestones</h4>
            <p className="text-xs text-muted-foreground">
              Track timeline checkpoints for delivery.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              milestonesArray.append({
                title: "",
                description: "",
                dueDate: "",
                status: "PENDING",
                sortOrder: milestonesArray.fields.length,
              })
            }
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </Button>
        </div>

        {milestonesArray.fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No milestones yet.</p>
        ) : (
          <div className="space-y-3">
            {milestonesArray.fields.map((field, index) => (
              <div
                key={field.id}
                className="space-y-3 rounded-lg border border-border/50 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Milestone {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove milestone ${index + 1}`}
                    onClick={() => milestonesArray.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`milestone-title-${index}`}>Title</Label>
                    <Input
                      id={`milestone-title-${index}`}
                      {...register(`milestones.${index}.title`)}
                    />
                    <FormFieldError
                      message={errors.milestones?.[index]?.title?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`milestone-due-${index}`}>Due date</Label>
                    <Input
                      id={`milestone-due-${index}`}
                      type="date"
                      {...register(`milestones.${index}.dueDate`)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`milestone-status-${index}`}>Status</Label>
                    <select
                      id={`milestone-status-${index}`}
                      className={selectClassName}
                      {...register(`milestones.${index}.status`)}
                    >
                      {MILESTONE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {MILESTONE_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`milestone-desc-${index}`}>
                      Description
                    </Label>
                    <Textarea
                      id={`milestone-desc-${index}`}
                      rows={2}
                      {...register(`milestones.${index}.description`)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-medium text-foreground">Attachments</h4>
            <p className="text-xs text-muted-foreground">
              Link file URLs (name + public/private URL metadata).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              attachmentsArray.append({
                fileName: "",
                fileUrl: "",
                mimeType: "",
                sizeBytes: null,
              })
            }
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </Button>
        </div>

        {attachmentsArray.fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attachments yet.</p>
        ) : (
          <div className="space-y-3">
            {attachmentsArray.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-lg border border-border/50 p-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <div className="space-y-2">
                  <Label htmlFor={`attachment-name-${index}`}>File name</Label>
                  <Input
                    id={`attachment-name-${index}`}
                    {...register(`attachments.${index}.fileName`)}
                  />
                  <FormFieldError
                    message={errors.attachments?.[index]?.fileName?.message}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`attachment-url-${index}`}>File URL</Label>
                  <Input
                    id={`attachment-url-${index}`}
                    type="url"
                    placeholder="https://"
                    {...register(`attachments.${index}.fileUrl`)}
                  />
                  <FormFieldError
                    message={errors.attachments?.[index]?.fileUrl?.message}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove attachment ${index + 1}`}
                    onClick={() => attachmentsArray.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Create project" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
