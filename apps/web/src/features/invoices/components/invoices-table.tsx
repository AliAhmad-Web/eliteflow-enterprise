"use client";

import type { Invoice, ListInvoicesQueryInput } from "@enterprise/shared";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import { ResponsiveDataView } from "@/components/common/data/responsive-data-view";
import { VirtualizedList } from "@/components/common/data/virtualized-list";
import { EmptyState } from "@/components/common/feedback/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format-money";

import { InvoiceStatusBadge } from "./invoice-status-badge";

type SortField = ListInvoicesQueryInput["sortBy"];

interface InvoicesTableProps {
  invoices: Invoice[];
  sortBy: SortField;
  sortOrder: "asc" | "desc";
  onSort: (field: SortField) => void;
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onDownloadPdf: (invoice: Invoice) => void;
  canWrite: boolean;
  canDelete: boolean;
}

function SortIcon({
  active,
  order,
}: {
  active: boolean;
  order: "asc" | "desc";
}) {
  if (!active) {
    return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />;
  }
  return order === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
  );
}

function InvoiceRowActions({
  invoice,
  onView,
  onEdit,
  onDelete,
  onDownloadPdf,
  canWrite,
  canDelete,
}: {
  invoice: Invoice;
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onDownloadPdf: (invoice: Invoice) => void;
  canWrite: boolean;
  canDelete: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="touch-target-auto"
          aria-label={`Actions for ${invoice.invoiceNumber}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(invoice)}>
          <Eye className="h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDownloadPdf(invoice)}>
          <Download className="h-4 w-4" />
          Download PDF
        </DropdownMenuItem>
        {canWrite ? (
          <DropdownMenuItem onClick={() => onEdit(invoice)}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(invoice)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InvoicesTable({
  invoices,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onEdit,
  onDelete,
  onDownloadPdf,
  canWrite,
  canDelete,
}: InvoicesTableProps) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        title="No invoices found"
        description="Try adjusting search or filters, or create a new invoice."
        className="border-0 bg-transparent"
      />
    );
  }

  const columns: { field: SortField; label: string; className?: string }[] = [
    { field: "invoiceNumber", label: "Invoice" },
    { field: "status", label: "Status" },
    { field: "issueDate", label: "Issued", className: "hidden lg:table-cell" },
    { field: "dueDate", label: "Due", className: "hidden xl:table-cell" },
    { field: "total", label: "Total", className: "hidden md:table-cell" },
  ];

  const actionProps = {
    onView,
    onEdit,
    onDelete,
    onDownloadPdf,
    canWrite,
    canDelete,
  };

  const table = (
    <div className="overflow-x-auto enterprise-table-shell">
      <table className="table-sticky-header w-full min-w-[640px] text-sm md:min-w-0">
        <thead>
          <tr className="border-b border-border/60">
            {columns.map((column) => (
              <th
                key={column.field}
                scope="col"
                className={cn(
                  "px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 lg:px-4",
                  column.className,
                )}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md hover:text-foreground focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                  onClick={() => onSort(column.field)}
                  aria-label={`Sort by ${column.label}`}
                >
                  {column.label}
                  <SortIcon
                    active={sortBy === column.field}
                    order={sortOrder}
                  />
                </button>
              </th>
            ))}
            <th
              scope="col"
              className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 lg:px-4"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              className="border-b border-border/50 last:border-0 hover:bg-muted/20"
            >
              <td className="px-3 py-3 lg:px-4">
                <button
                  type="button"
                  className="text-left font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                  onClick={() => onView(invoice)}
                >
                  {invoice.invoiceNumber}
                </button>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {invoice.clientName}
                  {invoice.projectName ? ` · ${invoice.projectName}` : ""}
                </p>
              </td>
              <td className="px-3 py-3 lg:px-4">
                <InvoiceStatusBadge status={invoice.status} />
              </td>
              <td className="hidden px-3 py-3 text-muted-foreground lg:table-cell lg:px-4">
                {invoice.issueDate}
              </td>
              <td className="hidden px-3 py-3 text-muted-foreground xl:table-cell xl:px-4">
                {invoice.dueDate}
              </td>
              <td className="hidden px-3 py-3 font-medium md:table-cell md:px-4">
                {formatMoney(invoice.total, invoice.currency)}
              </td>
              <td className="px-3 py-3 text-right lg:px-4">
                <InvoiceRowActions invoice={invoice} {...actionProps} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const cards = (
    <VirtualizedList
      items={invoices}
      estimateSize={120}
      getItemKey={(invoice) => invoice.id}
      renderItem={(invoice) => (
        <div className="pb-3">
          <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => onView(invoice)}
              >
                <p className="font-medium text-foreground">
                  {invoice.invoiceNumber}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {invoice.clientName}
                  {invoice.projectName ? ` · ${invoice.projectName}` : ""}
                </p>
              </button>
              <InvoiceRowActions invoice={invoice} {...actionProps} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <InvoiceStatusBadge status={invoice.status} />
                <span className="text-xs text-muted-foreground">
                  Due {invoice.dueDate}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {formatMoney(invoice.total, invoice.currency)}
              </p>
            </div>
          </div>
        </div>
      )}
    />
  );

  return <ResponsiveDataView table={table} cards={cards} />;
}
