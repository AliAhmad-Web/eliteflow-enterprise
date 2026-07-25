"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  INVOICE_STATUSES,
  calculateInvoiceTotals,
  createInvoiceSchema,
  type Client,
  type CreateInvoiceInput,
  type Invoice,
  type Project,
} from "@enterprise/shared";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/features/auth/components/form-field-error";
import { FORM_SELECT_CLASS_MD } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

import { INVOICE_STATUS_LABELS } from "../types/invoices.types";

const selectClassName = FORM_SELECT_CLASS_MD;

interface InvoiceFormProps {
  mode: "create" | "edit";
  initialValues?: Invoice | null;
  clients: Client[];
  projects: Project[];
  isSubmitting?: boolean;
  onSubmit: (values: CreateInvoiceInput) => Promise<void> | void;
  onCancel: () => void;
  className?: string;
}

function toFormValues(invoice?: Invoice | null): CreateInvoiceInput {
  return {
    clientId: invoice?.clientId ?? "",
    projectId: invoice?.projectId ?? "",
    status: invoice?.status ?? "DRAFT",
    issueDate: invoice?.issueDate ?? new Date().toISOString().slice(0, 10),
    dueDate:
      invoice?.dueDate ??
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    currency: invoice?.currency ?? "USD",
    taxRate: invoice?.taxRate ?? 0,
    discountAmount:
      invoice?.discountAmount != null ? String(invoice.discountAmount) : "0",
    notes: invoice?.notes ?? "",
    items:
      invoice?.items.map((item, index) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sortOrder: item.sortOrder ?? index,
      })) ?? [
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
          sortOrder: 0,
        },
      ],
  };
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

export function InvoiceForm({
  mode,
  initialValues,
  clients,
  projects,
  isSubmitting = false,
  onSubmit,
  onCancel,
  className,
}: InvoiceFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: toFormValues(initialValues),
  });

  const itemsArray = useFieldArray({ control, name: "items" });
  const watched = watch();
  const clientId = watched.clientId;

  const clientProjects = useMemo(
    () => projects.filter((project) => project.clientId === clientId),
    [projects, clientId],
  );

  const totals = useMemo(
    () =>
      calculateInvoiceTotals({
        items: (watched.items ?? []).map((item, index) => ({
          description: item.description ?? "",
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          sortOrder: index,
        })),
        taxRate: Number(watched.taxRate) || 0,
        discountAmount: watched.discountAmount ?? "0",
      }),
    [watched.items, watched.taxRate, watched.discountAmount],
  );

  useEffect(() => {
    reset(toFormValues(initialValues));
  }, [initialValues, reset]);

  return (
    <form
      className={cn("space-y-6", className)}
      noValidate
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invoice-client" required>
            Client
          </Label>
          <select
            id="invoice-client"
            className={selectClassName}
            {...register("clientId")}
          >
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.companyName}
              </option>
            ))}
          </select>
          <FormFieldError message={errors.clientId?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice-project">Project</Label>
          <select
            id="invoice-project"
            className={selectClassName}
            {...register("projectId")}
          >
            <option value="">No project</option>
            {clientProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <FormFieldError message={errors.projectId?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice-status" required>
            Status
          </Label>
          <select
            id="invoice-status"
            className={selectClassName}
            {...register("status")}
          >
            {INVOICE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {INVOICE_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
          <FormFieldError message={errors.status?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice-currency" required>
            Currency
          </Label>
          <Input id="invoice-currency" maxLength={3} {...register("currency")} />
          <FormFieldError message={errors.currency?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice-issue" required>
            Issue date
          </Label>
          <Input id="invoice-issue" type="date" {...register("issueDate")} />
          <FormFieldError message={errors.issueDate?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice-due" required>
            Due date
          </Label>
          <Input id="invoice-due" type="date" {...register("dueDate")} />
          <FormFieldError message={errors.dueDate?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice-tax" required>
            Tax rate (%)
          </Label>
          <Input
            id="invoice-tax"
            type="number"
            min={0}
            max={100}
            step="0.01"
            {...register("taxRate")}
          />
          <FormFieldError message={errors.taxRate?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice-discount">Discount amount</Label>
          <Input
            id="invoice-discount"
            type="number"
            min={0}
            step="0.01"
            {...register("discountAmount")}
          />
          <FormFieldError message={errors.discountAmount?.message} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="invoice-notes">Notes</Label>
          <Textarea id="invoice-notes" rows={3} {...register("notes")} />
          <FormFieldError message={errors.notes?.message} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label required>Line items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              itemsArray.append({
                description: "",
                quantity: 1,
                unitPrice: 0,
                sortOrder: itemsArray.fields.length,
              })
            }
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add item
          </Button>
        </div>
        <FormFieldError message={errors.items?.message} />

        {itemsArray.fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-3 rounded-lg border border-border/50 p-3 sm:grid-cols-[1.5fr_0.7fr_0.7fr_auto]"
          >
            <div className="space-y-2">
              <Input
                placeholder="Description"
                {...register(`items.${index}.description`)}
              />
              <FormFieldError
                message={errors.items?.[index]?.description?.message}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Qty"
                {...register(`items.${index}.quantity`)}
              />
              <FormFieldError
                message={errors.items?.[index]?.quantity?.message}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Unit price"
                {...register(`items.${index}.unitPrice`)}
              />
              <FormFieldError
                message={errors.items?.[index]?.unitPrice?.message}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove item"
              disabled={itemsArray.fields.length <= 1}
              onClick={() => itemsArray.remove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border/50 bg-muted/20 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatMoney(totals.subtotal, watched.currency || "USD")}</span>
        </div>
        <div className="mt-1 flex justify-between gap-4">
          <span className="text-muted-foreground">Discount</span>
          <span>
            {formatMoney(totals.discountAmount, watched.currency || "USD")}
          </span>
        </div>
        <div className="mt-1 flex justify-between gap-4">
          <span className="text-muted-foreground">
            Tax ({totals.taxRate}%)
          </span>
          <span>
            {formatMoney(totals.taxAmount, watched.currency || "USD")}
          </span>
        </div>
        <div className="mt-2 flex justify-between gap-4 border-t border-border pt-2 font-semibold">
          <span>Grand total</span>
          <span>{formatMoney(totals.total, watched.currency || "USD")}</span>
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
          {mode === "create" ? "Create invoice" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
