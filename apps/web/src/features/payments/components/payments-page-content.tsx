"use client";

import {
  PAYMENT_EXECUTION_STATUSES,
  PERMISSIONS,
  type ListPaymentsQueryInput,
  type PaymentExecutionStatusValue,
} from "@enterprise/shared";
import { Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { paymentDetailPath } from "@/constants/routes";
import { useHasPermission, useRole } from "@/features/rbac/hooks/use-permissions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { FORM_SELECT_CLASS } from "@/lib/form-styles";

import { usePaymentMethods, usePayments } from "../hooks/use-payments";
import { useUpdatePaymentMethod } from "../hooks/use-payment-mutations";
import {
  PAYMENT_EXECUTION_LABELS,
  PAYMENT_METHOD_LABELS,
} from "../types/payments.types";
import { PaymentStatusBadge } from "./payment-status-badge";

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

export function PaymentsPageContent() {
  const router = useRouter();
  const { isAdmin, isClient } = useRole();
  const canConfigure = useHasPermission(PERMISSIONS.PAYMENTS_CONFIGURE) && isAdmin;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(useDeferredValue(search.trim()), 300);
  const [status, setStatus] = useState<PaymentExecutionStatusValue | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const query: ListPaymentsQueryInput = useMemo(
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

  const paymentsQuery = usePayments(query);
  const methodsQuery = usePaymentMethods();
  const updateMethod = useUpdatePaymentMethod();
  const items = paymentsQuery.data?.items ?? [];
  const pagination = paymentsQuery.data?.pagination;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isClient ? "Payments" : "Payment verification"}
        description={
          isClient
            ? "Track invoices, payment methods, and verification status. Paid is never set from this screen."
            : "Review bank transfers, JazzCash, and EasyPaisa submissions. Verify before an invoice becomes paid."
        }
      />

      {canConfigure && methodsQuery.data ? (
        <Card>
          <CardContent className="grid gap-4 p-4 md:grid-cols-3">
            {methodsQuery.data.map((method) => (
              <div key={method.method} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{method.displayName}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={updateMethod.isPending}
                    onClick={() =>
                      void updateMethod.mutateAsync({
                        method: method.method,
                        input: { enabled: !method.enabled },
                      })
                    }
                  >
                    {method.enabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                {method.method === "BANK_TRANSFER" ? (
                  <div className="grid gap-2">
                    <Input
                      defaultValue={method.bankName ?? ""}
                      placeholder="Bank name"
                      onBlur={(event) =>
                        void updateMethod.mutateAsync({
                          method: method.method,
                          input: { bankName: event.target.value || null },
                        })
                      }
                    />
                    <Input
                      defaultValue={method.accountTitle ?? ""}
                      placeholder="Account title"
                      onBlur={(event) =>
                        void updateMethod.mutateAsync({
                          method: method.method,
                          input: { accountTitle: event.target.value || null },
                        })
                      }
                    />
                    <Input
                      defaultValue={method.accountNumber ?? ""}
                      placeholder="Account number"
                      onBlur={(event) =>
                        void updateMethod.mutateAsync({
                          method: method.method,
                          input: { accountNumber: event.target.value || null },
                        })
                      }
                    />
                    <Input
                      defaultValue={method.iban ?? ""}
                      placeholder="IBAN"
                      onBlur={(event) =>
                        void updateMethod.mutateAsync({
                          method: method.method,
                          input: { iban: event.target.value || null },
                        })
                      }
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {method.providerReady
                      ? "Merchant credentials are configured on the server."
                      : "Hosted checkout needs merchant credentials in API environment variables. Customers can still submit a transaction ID for admin verification."}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search payments, invoices, references"
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
              setStatus(event.target.value as PaymentExecutionStatusValue | "ALL");
              setPage(1);
            }}
          >
            <option value="ALL">All statuses</option>
            {PAYMENT_EXECUTION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {PAYMENT_EXECUTION_LABELS[value]}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {paymentsQuery.isLoading ? (
        <LoadingState label="Loading payments" />
      ) : paymentsQuery.isError ? (
        <ErrorState
          title="Could not load payments"
          onRetry={() => void paymentsQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description={
            isClient
              ? "Open an invoice to pay by bank transfer, JazzCash, or EasyPaisa."
              : "Customer payments awaiting verification will appear here."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="cursor-pointer border-t hover:bg-muted/30"
                  onClick={() => router.push(paymentDetailPath(item.id))}
                >
                  <td className="px-4 py-3 font-medium">{item.paymentNumber}</td>
                  <td className="px-4 py-3">{item.clientName ?? "—"}</td>
                  <td className="px-4 py-3">{item.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-3">{PAYMENT_METHOD_LABELS[item.method]}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatMoney(item.amount, item.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={item.status} />
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
            type="button"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
