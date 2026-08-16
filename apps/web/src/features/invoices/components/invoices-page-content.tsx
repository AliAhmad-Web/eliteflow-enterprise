"use client";

import {
  INVOICE_STATUSES,
  PERMISSIONS,
  type Invoice,
  type InvoiceStatusValue,
  type ListInvoicesQueryInput,
} from "@enterprise/shared";
import {
  AlertTriangle,
  Banknote,
  Plus,
  Receipt,
  Search,
  Wallet,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { invoiceDetailPath } from "@/constants/routes";
import { OpenedFromNotificationBanner } from "@/features/notifications/components/opened-from-notification-banner";
import { formatMoney } from "@/lib/format-money";
import { useEntityDeepLink } from "@/features/notifications/hooks/use-entity-deep-link";
import {
  useHasPermission,
  useRole,
} from "@/features/rbac/hooks/use-permissions";
import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

import { useDownloadInvoicePdf } from "../hooks/use-invoice-mutations";
import { useInvoiceStats, useInvoices } from "../hooks/use-invoices";
import { INVOICE_STATUS_LABELS } from "../types/invoices.types";
import { DeleteInvoiceDialog } from "./delete-invoice-dialog";
import { InvoiceFormDialog } from "./invoice-form-dialog";
import { InvoicesTable } from "./invoices-table";

const selectClassName = FORM_SELECT_CLASS;

export function InvoicesPageContent() {
  const router = useRouter();
  const { isAdmin, isClient } = useRole();
  const hasWrite = useHasPermission(PERMISSIONS.INVOICES_WRITE);
  const hasDelete = useHasPermission(PERMISSIONS.INVOICES_DELETE);
  const canWrite = isAdmin && hasWrite;
  const canDelete = isAdmin && hasDelete;

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const debouncedSearch = useDebouncedValue(deferredSearch, 300);
  const [status, setStatus] = useState<InvoiceStatusValue | "ALL">("ALL");
  const [sortBy, setSortBy] =
    useState<ListInvoicesQueryInput["sortBy"]>("createdAt");
  const [sortOrder, setSortOrder] =
    useState<ListInvoicesQueryInput["sortOrder"]>("desc");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [createOpen, setCreateOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [deleteInvoice, setDeleteInvoice] = useState<Invoice | null>(null);
  const deepLink = useEntityDeepLink();

  useEffect(() => {
    if (!deepLink.openId) return;
    router.replace(invoiceDetailPath(deepLink.openId));
  }, [deepLink.openId, router]);

  const query = useMemo<ListInvoicesQueryInput>(
    () => ({
      search: debouncedSearch,
      status: status === "ALL" ? undefined : status,
      sortBy,
      sortOrder,
      page,
      limit,
    }),
    [debouncedSearch, status, sortBy, sortOrder, page],
  );

  const { data, isLoading, isError, error, refetch, isFetching } =
    useInvoices(query);
  const statsQuery = useInvoiceStats();
  const pdfMutation = useDownloadInvoicePdf();
  const showInitialLoading = isLoading && !data;

  const handleSort = (field: ListInvoicesQueryInput["sortBy"]) => {
    if (sortBy === field) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const invoices = data?.items ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const pageDescription = isClient
    ? "View and download invoices billed to your company."
    : canWrite
      ? "Create invoices, track payments, and monitor revenue."
      : "Browse invoices and download PDFs (read-only).";

  return (
    <div className="space-y-6">
      <OpenedFromNotificationBanner
        visible={deepLink.bannerVisible}
        onDismiss={deepLink.dismissBanner}
      />
      <PageHeader
        title="Invoice & Billing"
        description={pageDescription}
        actionLabel={canWrite ? "Create invoice" : undefined}
        onAction={canWrite ? () => setCreateOpen(true) : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total invoices",
            value: statsQuery.data?.total ?? "—",
            icon: Receipt,
          },
          {
            label: "Paid revenue",
            value:
              statsQuery.data?.paidAmount != null
                ? formatMoney(statsQuery.data.paidAmount)
                : "—",
            icon: Banknote,
          },
          {
            label: "Outstanding",
            value:
              statsQuery.data?.outstandingAmount != null
                ? formatMoney(statsQuery.data.outstandingAmount)
                : "—",
            icon: Wallet,
          },
          {
            label: "Overdue",
            value: statsQuery.data?.overdue ?? "—",
            icon: AlertTriangle,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/50">
              <CardContent className="flex items-center justify-between gap-4 p-6">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {stat.value}
                  </p>
                </div>
                <div className="icon-box icon-box-md rounded-lg bg-primary/10 text-primary">
                  <Icon strokeWidth={1.75} aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Draft", value: statsQuery.data?.draft ?? "—" },
          { label: "Sent", value: statsQuery.data?.sent ?? "—" },
          { label: "Pending", value: statsQuery.data?.pending ?? "—" },
          { label: "Paid", value: statsQuery.data?.paid ?? "—" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 shadow-(--shadow-sm)">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search invoices, clients, projects..."
                className="pl-9"
                aria-label="Search invoices"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="invoice-status-filter" className="sr-only">
                Filter by status
              </label>
              <select
                id="invoice-status-filter"
                className={cn(selectClassName, "min-w-37.5")}
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as InvoiceStatusValue | "ALL");
                  setPage(1);
                }}
              >
                <option value="ALL">All statuses</option>
                {INVOICE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {INVOICE_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>

              {canWrite ? (
                <Button type="button" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create invoice
                </Button>
              ) : null}
            </div>
          </div>

          {showInitialLoading ? (
            <LoadingState label="Loading invoices" className="border-0" />
          ) : null}

          {isError ? (
            <ErrorState
              title="Could not load invoices"
              description={
                error instanceof Error
                  ? error.message
                  : "Please try again in a moment."
              }
              onRetry={() => void refetch()}
            />
          ) : null}

          {!showInitialLoading && !isError ? (
            <>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <p>
                  {pagination
                    ? `${pagination.total} invoice${pagination.total === 1 ? "" : "s"}`
                    : null}
                  {isFetching ? " · Refreshing…" : null}
                </p>
              </div>

              {invoices.length === 0 &&
              !deferredSearch &&
              status === "ALL" ? (
                <EmptyState
                  title="No invoices yet"
                  description={
                    canWrite
                      ? "Create your first invoice to bill clients and track payments."
                      : "No invoices are available in your current scope."
                  }
                  actionLabel={canWrite ? "Create invoice" : undefined}
                  onAction={canWrite ? () => setCreateOpen(true) : undefined}
                />
              ) : (
                <InvoicesTable
                  invoices={invoices}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  onView={(invoice) =>
                    router.push(invoiceDetailPath(invoice.id))
                  }
                  onEdit={(invoice) => setEditInvoice(invoice)}
                  onDelete={(invoice) => setDeleteInvoice(invoice)}
                  onDownloadPdf={(invoice) => {
                    void pdfMutation.mutateAsync(invoice.id);
                  }}
                  canWrite={canWrite}
                  canDelete={canDelete}
                />
              )}

              {totalPages > 1 ? (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      <InvoiceFormDialog
        open={createOpen}
        mode="create"
        onOpenChange={setCreateOpen}
      />

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
      />
    </div>
  );
}
