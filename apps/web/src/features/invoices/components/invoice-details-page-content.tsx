"use client";

import type { Invoice } from "@enterprise/shared";
import { PERMISSIONS } from "@enterprise/shared";
import { ArrowLeft, Download, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import {
  useHasPermission,
  useRole,
} from "@/features/rbac/hooks/use-permissions";
import { InvoicePayPanel } from "@/features/payments/components/invoice-pay-panel";
import { ApiClientError } from "@/services/api/api-error";

import { useDownloadInvoicePdf, useIssueInvoice } from "../hooks/use-invoice-mutations";
import { useInvoice } from "../hooks/use-invoices";
import {
  INVOICE_KIND_LABELS,
  INVOICE_PAYMENT_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
} from "../types/invoices.types";
import { DeleteInvoiceDialog } from "./delete-invoice-dialog";
import { InvoiceFormDialog } from "./invoice-form-dialog";
import { InvoiceStatusBadge } from "./invoice-status-badge";

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground break-words">
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function InvoiceDetailsPageContent() {
  const params = useParams<{ id: string }>();
  const invoiceId = params.id;
  const router = useRouter();

  const { isAdmin, isClient } = useRole();
  const hasWrite = useHasPermission(PERMISSIONS.INVOICES_WRITE);
  const hasDelete = useHasPermission(PERMISSIONS.INVOICES_DELETE);
  const canWrite = isAdmin && hasWrite;
  const canDelete = isAdmin && hasDelete;

  const invoiceQuery = useInvoice(invoiceId);
  const pdfMutation = useDownloadInvoicePdf();
  const issueMutation = useIssueInvoice();
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [deleteInvoice, setDeleteInvoice] = useState<Invoice | null>(null);

  const invoice = invoiceQuery.data;

  if (invoiceQuery.isLoading) {
    return <LoadingState label="Loading invoice" />;
  }

  if (invoiceQuery.isError || !invoice) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href={ROUTES.INVOICES}>
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            Back to invoices
          </Link>
        </Button>
        <ErrorState
          title="Could not load invoice"
          description={
            invoiceQuery.error instanceof Error
              ? invoiceQuery.error.message
              : "This invoice may have been deleted or you lack access."
          }
          onRetry={() => void invoiceQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href={ROUTES.INVOICES}>
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            Back to invoices
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader
            title={invoice.invoiceNumber}
            description={`${invoice.clientName} · ${INVOICE_STATUS_LABELS[invoice.status]}`}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              isLoading={pdfMutation.isPending}
              onClick={() => {
                void pdfMutation.mutateAsync(invoice.id);
              }}
            >
              <Download className="mr-2 size-4" aria-hidden />
              Download PDF
            </Button>
            {canWrite && invoice.status === "DRAFT" ? (
              <Button
                type="button"
                variant="secondary"
                isLoading={issueMutation.isPending}
                onClick={() => void issueMutation.mutateAsync(invoice.id)}
              >
                Issue invoice
              </Button>
            ) : null}
            {canWrite && !invoice.quoteId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditInvoice(invoice)}
              >
                <Pencil className="mr-2 size-4" aria-hidden />
                Edit
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteInvoice(invoice)}
              >
                <Trash2 className="mr-2 size-4" aria-hidden />
                Delete
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        {pdfMutation.error instanceof ApiClientError ? (
          <p className="text-sm text-destructive" role="alert">
            {pdfMutation.error.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Line items</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {invoice.items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border/50 p-4 text-sm"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <p className="font-medium text-foreground">
                        {item.description}
                      </p>
                      <p className="shrink-0 font-semibold tabular-nums">
                        {formatMoney(item.lineTotal, invoice.currency)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.quantity} ×{" "}
                      {formatMoney(item.unitPrice, invoice.currency)}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Row
                label="Subtotal"
                value={formatMoney(invoice.subtotal, invoice.currency)}
              />
              <Row
                label="Discount"
                value={formatMoney(invoice.discountAmount, invoice.currency)}
              />
              <Row
                label={`Tax (${invoice.taxRate}%)`}
                value={formatMoney(invoice.taxAmount, invoice.currency)}
              />
              <div className="mt-2 flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
                <span>Grand total</span>
                <span className="tabular-nums">
                  {formatMoney(invoice.total, invoice.currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment history</CardTitle>
            </CardHeader>
            <CardContent>
              {(invoice.paymentHistory ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No history yet.</p>
              ) : (
                <ul className="space-y-3">
                  {(invoice.paymentHistory ?? []).map((entry) => (
                    <li
                      key={entry.id}
                      className="border-l-2 border-border pl-3 text-sm"
                    >
                      <p className="text-foreground">
                        {INVOICE_STATUS_LABELS[entry.status]}
                        {entry.note ? ` — ${entry.note}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.actorFirstName
                          ? `${entry.actorFirstName} ${entry.actorLastName ?? ""}`
                          : "System"}{" "}
                        · {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {invoice.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                  {invoice.notes}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Billing details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <DetailItem label="Client" value={invoice.clientName} />
              <DetailItem
                label="Project"
                value={invoice.projectName ?? "—"}
              />
              <DetailItem
                label="Commercial status"
                value={INVOICE_STATUS_LABELS[invoice.status]}
              />
              <DetailItem
                label="Payment status"
                value={
                  INVOICE_PAYMENT_STATUS_LABELS[
                    invoice.paymentStatus ?? "UNPAID"
                  ]
                }
              />
              {invoice.invoiceKind ? (
                <DetailItem
                  label="Invoice type"
                  value={INVOICE_KIND_LABELS[invoice.invoiceKind]}
                />
              ) : null}
              {invoice.quoteNumber ? (
                <DetailItem label="Quote" value={invoice.quoteNumber} />
              ) : null}
              <DetailItem label="Issue date" value={invoice.issueDate} />
              <DetailItem label="Due date" value={invoice.dueDate} />
              <DetailItem
                label="Paid"
                value={formatMoney(invoice.paidAmount ?? 0, invoice.currency)}
              />
              <DetailItem
                label="Remaining"
                value={formatMoney(
                  invoice.remainingAmount ??
                    Math.max(0, invoice.total - (invoice.paidAmount ?? 0)),
                  invoice.currency,
                )}
              />
              <DetailItem label="Tax rate" value={`${invoice.taxRate}%`} />
            </CardContent>
          </Card>

          {isClient &&
          invoice.status !== "PAID" &&
          invoice.status !== "CANCELLED" ? (
            <InvoicePayPanel invoice={invoice} />
          ) : null}
        </div>
      </div>

      <InvoiceFormDialog
        open={Boolean(editInvoice)}
        mode="edit"
        invoice={editInvoice}
        onOpenChange={(open) => {
          if (!open) setEditInvoice(null);
        }}
      />

      <DeleteInvoiceDialog
        open={Boolean(deleteInvoice)}
        invoice={deleteInvoice}
        onOpenChange={(open) => {
          if (!open) setDeleteInvoice(null);
        }}
        onDeleted={() => {
          router.push(ROUTES.INVOICES);
        }}
      />
    </div>
  );
}
