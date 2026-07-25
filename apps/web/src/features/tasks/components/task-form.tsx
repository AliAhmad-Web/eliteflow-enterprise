"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  createTaskSchema,
  employeeUpdateTaskSchema,
  type CreateTaskInput,
  type EmployeeUpdateTaskInput,
  type Task,
} from "@enterprise/shared";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/features/auth/components/form-field-error";
import { FORM_SELECT_CLASS_MD } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

import type {
  TaskAssigneeOption,
  TaskProjectOption,
} from "../types/tasks.types";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "../types/tasks.types";

const selectClassName = FORM_SELECT_CLASS_MD;

interface TaskFormProps {
  mode: "create" | "edit";
  variant?: "full" | "employee";
  initialValues?: Task | null;
  projects: TaskProjectOption[];
  assignees: TaskAssigneeOption[];
  isSubmitting?: boolean;
  onSubmit: (
    values: CreateTaskInput | EmployeeUpdateTaskInput,
  ) => Promise<void> | void;
  onCancel: () => void;
  className?: string;
}

function toFormValues(task?: Task | null): CreateTaskInput {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    projectId: task?.projectId ?? "",
    assignedToId: task?.assignedToId ?? "",
    status: task?.status ?? "TODO",
    priority: task?.priority ?? "MEDIUM",
    labels: task?.labels ?? [],
    startDate: task?.startDate ?? "",
    dueDate: task?.dueDate ?? "",
    progress: task?.progress ?? 0,
    estimatedHours:
      task?.estimatedHours != null ? String(task.estimatedHours) : "",
    attachments:
      task?.attachments.map((attachment) => ({
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        mimeType: attachment.mimeType ?? "",
        sizeBytes: attachment.sizeBytes,
      })) ?? [],
  };
}

export function TaskForm({
  mode,
  variant = "full",
  initialValues,
  projects,
  assignees,
  isSubmitting = false,
  onSubmit,
  onCancel,
  className,
}: TaskFormProps) {
  const isEmployee = variant === "employee";
  const [labelDraft, setLabelDraft] = useState("");

  const fullForm = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: toFormValues(initialValues),
  });

  const employeeForm = useForm<EmployeeUpdateTaskInput>({
    resolver: zodResolver(employeeUpdateTaskSchema),
    defaultValues: {
      status: initialValues?.status ?? "TODO",
      progress: initialValues?.progress ?? 0,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = fullForm;

  const {
    register: registerEmployee,
    handleSubmit: handleEmployeeSubmit,
    reset: resetEmployee,
    formState: { errors: employeeErrors },
  } = employeeForm;

  const attachmentsArray = useFieldArray({
    control,
    name: "attachments",
  });

  const labels = watch("labels") ?? [];

  useEffect(() => {
    reset(toFormValues(initialValues));
    resetEmployee({
      status: initialValues?.status ?? "TODO",
      progress: initialValues?.progress ?? 0,
    });
  }, [initialValues, reset, resetEmployee]);

  const addLabel = () => {
    const next = labelDraft.trim();
    if (!next || labels.includes(next) || labels.length >= 20) {
      return;
    }
    setValue("labels", [...labels, next], {
      shouldDirty: true,
      shouldValidate: true,
    });
    setLabelDraft("");
  };

  const removeLabel = (label: string) => {
    setValue(
      "labels",
      labels.filter((item) => item !== label),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  if (isEmployee) {
    return (
      <form
        className={cn("space-y-6", className)}
        noValidate
        onSubmit={handleEmployeeSubmit(async (values) => {
          await onSubmit(values);
        })}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="task-status" required>
              Status
            </Label>
            <select
              id="task-status"
              className={selectClassName}
              {...registerEmployee("status")}
            >
              {TASK_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {TASK_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
            <FormFieldError message={employeeErrors.status?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-progress" required>
              Progress (%)
            </Label>
            <Input
              id="task-progress"
              type="number"
              min={0}
              max={100}
              error={Boolean(employeeErrors.progress)}
              {...registerEmployee("progress")}
            />
            <FormFieldError message={employeeErrors.progress?.message} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Update progress
          </Button>
        </div>
      </form>
    );
  }

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
          <Label htmlFor="task-title" required>
            Title
          </Label>
          <Input
            id="task-title"
            error={Boolean(errors.title)}
            {...register("title")}
          />
          <FormFieldError message={errors.title?.message} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="task-description">Description</Label>
          <Textarea
            id="task-description"
            rows={3}
            {...register("description")}
          />
          <FormFieldError message={errors.description?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-project">Project</Label>
          <select
            id="task-project"
            className={selectClassName}
            {...register("projectId")}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <FormFieldError message={errors.projectId?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-assignee">Assignee</Label>
          <select
            id="task-assignee"
            className={selectClassName}
            {...register("assignedToId")}
          >
            <option value="">Unassigned</option>
            {assignees.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
          <FormFieldError message={errors.assignedToId?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-status" required>
            Status
          </Label>
          <select
            id="task-status"
            className={selectClassName}
            {...register("status")}
          >
            {TASK_STATUSES.map((value) => (
              <option key={value} value={value}>
                {TASK_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
          <FormFieldError message={errors.status?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-priority" required>
            Priority
          </Label>
          <select
            id="task-priority"
            className={selectClassName}
            {...register("priority")}
          >
            {TASK_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {TASK_PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
          <FormFieldError message={errors.priority?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-start">Start date</Label>
          <Input id="task-start" type="date" {...register("startDate")} />
          <FormFieldError message={errors.startDate?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-due">Due date</Label>
          <Input id="task-due" type="date" {...register("dueDate")} />
          <FormFieldError message={errors.dueDate?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-progress" required>
            Progress (%)
          </Label>
          <Input
            id="task-progress"
            type="number"
            min={0}
            max={100}
            error={Boolean(errors.progress)}
            {...register("progress")}
          />
          <FormFieldError message={errors.progress?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-hours">Estimated hours</Label>
          <Input
            id="task-hours"
            type="number"
            min={0}
            step="0.25"
            {...register("estimatedHours")}
          />
          <FormFieldError message={errors.estimatedHours?.message} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="task-label-draft">Labels</Label>
          <div className="flex gap-2">
            <Input
              id="task-label-draft"
              value={labelDraft}
              onChange={(event) => setLabelDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addLabel();
                }
              }}
              placeholder="Add a label and press Enter"
            />
            <Button type="button" variant="secondary" onClick={addLabel}>
              Add
            </Button>
          </div>
          {labels.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {labels.map((label) => (
                <button
                  key={label}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground"
                  onClick={() => removeLabel(label)}
                >
                  {label}
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : null}
          <FormFieldError message={errors.labels?.message} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Attachments (URL)</Label>
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
            Add attachment
          </Button>
        </div>

        {attachmentsArray.fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-3 rounded-lg border border-border/50 p-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div className="space-y-2">
              <Input
                placeholder="File name"
                {...register(`attachments.${index}.fileName`)}
              />
              <FormFieldError
                message={errors.attachments?.[index]?.fileName?.message}
              />
            </div>
            <div className="space-y-2">
              <Input
                placeholder="https://..."
                {...register(`attachments.${index}.fileUrl`)}
              />
              <FormFieldError
                message={errors.attachments?.[index]?.fileUrl?.message}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove attachment"
              onClick={() => attachmentsArray.remove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Create task" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
