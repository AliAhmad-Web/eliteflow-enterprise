"use client";

import {
  CUSTOMER_REQUEST_PRIORITIES,
  CUSTOMER_REQUEST_STATUSES,
  CUSTOMER_REQUEST_TYPES,
  type CustomerRequestPriorityValue,
  type CustomerRequestStatusValue,
  type CustomerRequestTypeValue,
  type ListCustomerRequestsQueryInput,
} from "@enterprise/shared";
import { ClipboardList, Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { customerRequestDetailPath } from "@/constants/routes";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

import { useCustomerRequests } from "../hooks/use-customer-requests";
import {
  CUSTOMER_REQUEST_PRIORITY_LABELS,
  CUSTOMER_REQUEST_STATUS_LABELS,
  CUSTOMER_REQUEST_TYPE_LABELS,
} from "../types/query-keys";
import { CustomerRequestStatusBadge } from "./customer-request-status-badge";

const selectClassName = FORM_SELECT_CLASS;

export function StaffRequestsPageContent() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const debouncedSearch = useDebouncedValue(deferredSearch, 300);
  const [status, setStatus] = useState<CustomerRequestStatusValue | "ALL">(
    "SUBMITTED",
  );
  const [type, setType] = useState<CustomerRequestTypeValue | "ALL">("ALL");
  const [priority, setPriority] = useState<
    CustomerRequestPriorityValue | "ALL"
  >("ALL");
  const [page, setPage] = useState(1);
  const limit = 15;

  const query = useMemo<ListCustomerRequestsQueryInput>(
    () => ({
      search: debouncedSearch,
      status: status === "ALL" ? undefined : status,
      type: type === "ALL" ? undefined : type,
      priority: priority === "ALL" ? undefined : priority,
      sortBy: "createdAt",
      sortOrder: "desc",
      page,
      limit,
    }),
    [debouncedSearch, status, type, priority, page],
  );

  const { data, isLoading, isError, error, refetch, isFetching } =
    useCustomerRequests(query);
  const showInitialLoading = isLoading && !data;

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Requests"
        description="Review client intake requests, clarify requirements, approve, and convert to delivery work."
      />

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
                placeholder="Search by title or client…"
                className="pl-9"
                aria-label="Search work requests"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className={cn(selectClassName, "min-w-40")}
                value={status}
                aria-label="Filter by status"
                onChange={(event) => {
                  setStatus(
                    event.target.value as CustomerRequestStatusValue | "ALL",
                  );
                  setPage(1);
                }}
              >
                <option value="ALL">All statuses</option>
                {CUSTOMER_REQUEST_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {CUSTOMER_REQUEST_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>

              <select
                className={cn(selectClassName, "min-w-35")}
                value={type}
                aria-label="Filter by type"
                onChange={(event) => {
                  setType(
                    event.target.value as CustomerRequestTypeValue | "ALL",
                  );
                  setPage(1);
                }}
              >
                <option value="ALL">All types</option>
                {CUSTOMER_REQUEST_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {CUSTOMER_REQUEST_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>

              <select
                className={cn(selectClassName, "min-w-35")}
                value={priority}
                aria-label="Filter by priority"
                onChange={(event) => {
                  setPriority(
                    event.target.value as CustomerRequestPriorityValue | "ALL",
                  );
                  setPage(1);
                }}
              >
                <option value="ALL">All priorities</option>
                {CUSTOMER_REQUEST_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {CUSTOMER_REQUEST_PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showInitialLoading ? (
            <LoadingState label="Loading work requests" className="border-0" />
          ) : null}

          {isError ? (
            <ErrorState
              title="Could not load work requests"
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
                    ? `${pagination.total} request${pagination.total === 1 ? "" : "s"}`
                    : null}
                  {isFetching ? " · Refreshing…" : null}
                </p>
              </div>

              {items.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Queue is clear"
                  description="No client requests match the current filters."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Title</th>
                        <th className="px-4 py-3 font-medium">Customer</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Priority</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className="transition-colors hover:bg-accent/40"
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={customerRequestDetailPath(item.id)}
                              className="font-medium text-foreground hover:underline"
                            >
                              {item.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.createdByName ?? item.clientName ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {CUSTOMER_REQUEST_TYPE_LABELS[item.type]}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {CUSTOMER_REQUEST_PRIORITY_LABELS[item.priority]}
                          </td>
                          <td className="px-4 py-3">
                            <CustomerRequestStatusBadge status={item.status} />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.submittedAt
                              ? new Date(item.submittedAt).toLocaleDateString()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
    </div>
  );
}
