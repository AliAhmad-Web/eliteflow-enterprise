"use client";

import {
  PAYMENT_MODELS,
  PERMISSIONS,
  type ListQuotesQueryInput,
  type QuoteStatusValue,
} from "@enterprise/shared";
import { Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ROUTES, quoteDetailPath } from "@/constants/routes";
import { useHasPermission, useRole } from "@/features/rbac/hooks/use-permissions";
import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { formatMoney } from "@/lib/format-money";

import { useQuotes } from "../hooks/use-quotes";
import { QUOTE_STATUS_LABELS } from "../types/quotes.types";
import { QuoteStatusBadge } from "./quote-status-badge";

export function QuotesPageContent() {
  const router = useRouter();
  const { isAdmin, isClient } = useRole();
  const canWrite = useHasPermission(PERMISSIONS.QUOTES_WRITE) && isAdmin;

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const debouncedSearch = useDebouncedValue(deferredSearch, 300);
  const [status, setStatus] = useState<QuoteStatusValue | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const query: ListQuotesQueryInput = useMemo(
    () => ({
      search: debouncedSearch,
      status: status === "ALL" ? undefined : status,
      sortBy: "createdAt",
      sortOrder: "desc",
      page,
      limit: 10,
    }),
    [debouncedSearch, status, page],
  );

  const quotesQuery = useQuotes(query);
  const quotes = quotesQuery.data?.items ?? [];
  const pagination = quotesQuery.data?.pagination;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isClient ? "Quotes" : "Quotes & estimates"}
        description={
          isClient
            ? "Review deal amounts, payment schedules, and approve or reject quotes."
            : "Create a quote from an approved request, set the deal amount, and send it for customer approval."
        }
        actionLabel={canWrite ? "New quote" : undefined}
        onAction={canWrite ? () => router.push(ROUTES.QUOTES_NEW) : undefined}
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search quotes"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className={FORM_SELECT_CLASS}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as QuoteStatusValue | "ALL");
              setPage(1);
            }}
          >
            <option value="ALL">All statuses</option>
            {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {quotesQuery.isLoading ? (
        <LoadingState label="Loading quotes" />
      ) : quotesQuery.isError ? (
        <ErrorState
          title="Could not load quotes"
          onRetry={() => void quotesQuery.refetch()}
        />
      ) : quotes.length === 0 ? (
        <EmptyState
          title="No quotes yet"
          description={
            canWrite
              ? "Open an approved work request and create a quote from there — no company search required."
              : "When EliteFlow sends a quote, it will appear here."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Quote</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Deal amount</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="cursor-pointer border-t border-border/50 hover:bg-muted/30"
                  onClick={() => router.push(quoteDetailPath(quote.id))}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{quote.quoteNumber}</div>
                    <div className="text-muted-foreground">{quote.title}</div>
                  </td>
                  <td className="px-4 py-3">{quote.clientName}</td>
                  <td className="px-4 py-3">{quote.projectName}</td>
                  <td className="px-4 py-3 font-medium">
                    {formatMoney(quote.total, quote.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {PAYMENT_MODELS.includes(quote.paymentModel)
                      ? quote.paymentModel.replaceAll("_", " ")
                      : quote.paymentModel}
                  </td>
                  <td className="px-4 py-3">
                    <QuoteStatusBadge status={quote.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
