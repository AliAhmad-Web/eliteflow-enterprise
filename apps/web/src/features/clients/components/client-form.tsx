"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CLIENT_STATUSES,
  createClientSchema,
  type Client,
  type CreateClientInput,
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

import { CLIENT_STATUS_LABELS } from "../types/clients.types";

const selectClassName = FORM_SELECT_CLASS_MD;

interface ClientFormProps {
  mode: "create" | "edit";
  initialValues?: Client | null;
  isSubmitting?: boolean;
  onSubmit: (values: CreateClientInput) => Promise<void> | void;
  onCancel: () => void;
  className?: string;
}

function toFormValues(client?: Client | null): CreateClientInput {
  return {
    companyName: client?.companyName ?? "",
    contactName: client?.contactName ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    website: client?.website ?? "",
    addressLine1: client?.addressLine1 ?? "",
    city: client?.city ?? "",
    country: client?.country ?? "",
    status: client?.status ?? "LEAD",
    notes: client?.notes ?? "",
  };
}

export function ClientForm({
  mode,
  initialValues,
  isSubmitting = false,
  onSubmit,
  onCancel,
  className,
}: ClientFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: toFormValues(initialValues),
  });

  useEffect(() => {
    reset(toFormValues(initialValues));
  }, [initialValues, reset]);

  return (
    <form
      className={cn("space-y-4", className)}
      noValidate
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="companyName" required>
            Company name
          </Label>
          <Input
            id="companyName"
            autoComplete="organization"
            error={Boolean(errors.companyName)}
            {...register("companyName")}
          />
          <FormFieldError message={errors.companyName?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactName" required>
            Contact name
          </Label>
          <Input
            id="contactName"
            autoComplete="name"
            error={Boolean(errors.contactName)}
            {...register("contactName")}
          />
          <FormFieldError message={errors.contactName?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" required>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            error={Boolean(errors.email)}
            {...register("email")}
          />
          <FormFieldError message={errors.email?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            error={Boolean(errors.phone)}
            {...register("phone")}
          />
          <FormFieldError message={errors.phone?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://"
            error={Boolean(errors.website)}
            {...register("website")}
          />
          <FormFieldError message={errors.website?.message} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="addressLine1">Address</Label>
          <Input
            id="addressLine1"
            autoComplete="street-address"
            error={Boolean(errors.addressLine1)}
            {...register("addressLine1")}
          />
          <FormFieldError message={errors.addressLine1?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            autoComplete="address-level2"
            error={Boolean(errors.city)}
            {...register("city")}
          />
          <FormFieldError message={errors.city?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            autoComplete="country-name"
            error={Boolean(errors.country)}
            {...register("country")}
          />
          <FormFieldError message={errors.country?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status" required>
            Status
          </Label>
          <select
            id="status"
            className={cn(selectClassName, errors.status && "border-destructive")}
            aria-invalid={Boolean(errors.status)}
            {...register("status")}
          >
            {CLIENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CLIENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <FormFieldError message={errors.status?.message} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={4}
            error={Boolean(errors.notes)}
            {...register("notes")}
          />
          <FormFieldError message={errors.notes?.message} />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Create client" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
