"use client";

import type { Invoice } from "@enterprise/shared";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiClientError } from "@/services/api/api-error";

import { useDownloadInvoicePdf } from "../hooks/use-invoice-mutations";
import { useInvoice } from "../hooks/use-invoices";
import { INVOICE_STATUS_LABELS } from "../types/invoices.types";
import { InvoiceStatusBadge } from "./invoice-status-badge";

interface InvoiceDetailsDrawerProps {
  open: boolean;
  invoiceId: string | null;
  onOpenChange: (open: boolean) => void;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  canWrite?: boolean;
  canDelete?: boolean;
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

export function InvoiceDetailsDrawer({
  open,
  invoiceId,
  onOpenChange,
  onEdit,
  onDelete,
  canWrite = false,
  canDelete = false,
}: InvoiceDetailsDrawerProps) {
  const invoiceQuery = useInvoice(open ? invoiceId : null);
  const pdfMutation = useDownloadInvoicePdf();
  const invoice = invoiceQuery.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-lg overflow-y-auto bg-background p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border px-6 py-4 text-left">
          <SheetTitle className="pr-8">
            {invoice?.invoiceNumber ?? "Invoice details"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-6 py-5">
          {invoiceQuery.isLoading ? (
            <LoadingState
              label="Loading invoice"
              className="min-h-[200px] border-0 bg-transparent"
            />
          ) : null}

          {invoiceQuery.isError ? (
            <ErrorState
              title="Could not load invoice"
              description={
                invoiceQuery.error instanceof Error
                  ? invoiceQuery.error.message
                  : "Please try again."
              }
              onRetry={() => void invoiceQuery.refetch()}
            />
          ) : null}

          {invoice ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <InvoiceStatusBadge status={invoice.status} />
                <span className="text-sm text-muted-foreground">
                  {INVOICE_STATUS_LABELS[invoice.status]}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Client" value={invoice.clientName} />
                <DetailItem
                  label="Project"
                  value={invoice.projectName ?? "—"}
                />
                <DetailItem label="Issue date" value={invoice.issueDate} />
                <DetailItem label="Due date" value={invoice.dueDate} />
                <DetailItem label="Currency" value={invoice.currency} />
                <DetailItem
                  label="Tax rate"
                  value={`${invoice.taxRate}%`}
                />
              </div>

              {invoice.notes ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              ) : null}

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Line items
                </p>
                <ul className="space-y-2">
                  {invoice.items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-border/50 p-3 text-sm"
                    >
                      <p className="font-medium text-foreground">
                        {item.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.quantity} ×{" "}
                        {formatMoney(item.unitPrice, invoice.currency)} ={" "}
                        {formatMoney(item.lineTotal, invoice.currency)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/20 p-4 text-sm">
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
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
                  <span>Grand total</span>
                  <span>{formatMoney(invoice.total, invoice.currency)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Payment history
                </p>
                {(invoice.paymentHistory ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No history yet.</p>
                ) : (
                  <ul className="space-y-2">
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
              </div>

              {pdfMutation.error instanceof ApiClientError ? (
                <p className="text-sm text-destructive" role="alert">
                  {pdfMutation.error.message}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  isLoading={pdfMutation.isPending}
                  onClick={() => {
                    void pdfMutation.mutateAsync(invoice.id);
                  }}
                >
                  Download PDF
                </Button>
                {canWrite ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onEdit?.(invoice)}
                  >
                    Edit
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => onDelete?.(invoice)}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
