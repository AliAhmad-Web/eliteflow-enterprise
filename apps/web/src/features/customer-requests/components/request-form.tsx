"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CUSTOMER_REQUEST_PRIORITIES,
  CUSTOMER_REQUEST_TYPES,
  createCustomerRequestSchema,
  type CreateCustomerRequestInput,
  type CustomerRequestDto,
  type CustomerRequestTypeValue,
  type Project,
} from "@enterprise/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/features/auth/components/form-field-error";
import { FORM_SELECT_CLASS_MD } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

import {
  CUSTOMER_REQUEST_PRIORITY_LABELS,
  CUSTOMER_REQUEST_TYPE_LABELS,
} from "../types/query-keys";

const selectClassName = FORM_SELECT_CLASS_MD;

export type RequestFormValues = CreateCustomerRequestInput;

interface RequestFormProps {
  mode: "create" | "edit";
  initialValues?: CustomerRequestDto | null;
  defaultType?: CustomerRequestTypeValue;
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
    targetProjectId: request?.targetProjectId ?? "",
    submit: false,
  };
}

export function RequestForm({
  mode,
  initialValues,
  defaultType,
  projects,
  isSubmitting = false,
  onSubmit,
  onCancel,
  className,
}: RequestFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(createCustomerRequestSchema),
    defaultValues: toFormValues(initialValues, defaultType),
  });

  const requestType = watch("type");

  useEffect(() => {
    reset(toFormValues(initialValues, defaultType));
  }, [initialValues, defaultType, reset]);

  const submitValues = async (values: RequestFormValues, submit: boolean) => {
    const payload: RequestFormValues = {
      ...values,
      description: values.description || null,
      requirements: values.requirements || null,
      preferredDeadline: values.preferredDeadline || null,
      expectedBudget: values.expectedBudget || null,
      additionalNotes: values.additionalNotes || null,
      targetProjectId:
        values.type === "NEW_TASK" ? values.targetProjectId || null : null,
      submit,
    };
    await onSubmit(payload, { submit });
  };

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
              if (next !== "NEW_TASK") {
                setValue("targetProjectId", "", { shouldDirty: true });
              }
            }}
          >
            {CUSTOMER_REQUEST_TYPES.map((type) => (
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

        {requestType === "NEW_TASK" ? (
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
            {...register("expectedBudget")}
          />
          <FormFieldError message={errors.expectedBudget?.message} />
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
          <Label htmlFor="request-notes">Additional notes</Label>
          <Textarea id="request-notes" rows={3} {...register("additionalNotes")} />
          <FormFieldError message={errors.additionalNotes?.message} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Attachments: upload files in File Manager, then ask staff to link them
        during review. Direct attachment upload is not available in this form
        yet.
      </p>

      <div className="flex flex-wrap gap-2">
        {mode === "create" ? (
          <>
            <Button type="submit" variant="secondary" disabled={isSubmitting}>
              Save draft
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit(async (values) => {
                await submitValues(values, true);
              })}
            >
              Submit request
            </Button>
          </>
        ) : (
          <Button type="submit" disabled={isSubmitting}>
            Save changes
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
