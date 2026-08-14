"use client";

import {
  PAYMENT_MODEL_LABELS,
  PERMISSIONS,
} from "@enterprise/shared";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { invoiceDetailPath, ROUTES } from "@/constants/routes";
import { useHasPermission, useRole } from "@/features/rbac/hooks/use-permissions";
import { ApiClientError } from "@/services/api/api-error";

import {
  useApproveQuote,
  useCancelQuote,
  useGenerateQuoteInvoices,
  useRejectQuote,
  useSendQuote,
} from "../hooks/use-quote-mutations";
import { useQuote } from "../hooks/use-quotes";
import { PaymentScheduleTable } from "./payment-schedule-table";
import { QuoteStatusBadge } from "./quote-status-badge";

function formatMoney(value: number | null | undefined, currency = "USD") {
  if (value == null) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

export function QuoteDetailsPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin, isClient } = useRole();
  const canWrite = useHasPermission(PERMISSIONS.QUOTES_WRITE) && isAdmin;
  const canSend = useHasPermission(PERMISSIONS.QUOTES_SEND) && isAdmin;
  const canApprove = useHasPermission(PERMISSIONS.QUOTES_APPROVE) && isClient;
  const canInvoice = useHasPermission(PERMISSIONS.INVOICES_WRITE) && isAdmin;

  const quoteQuery = useQuote(params.id);
  const sendMutation = useSendQuote();
  const approveMutation = useApproveQuote();
  const rejectMutation = useRejectQuote();
  const cancelMutation = useCancelQuote();
  const generateMutation = useGenerateQuoteInvoices();
  const [rejectReason, setRejectReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const quote = quoteQuery.data;
  const busy =
    sendMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    generateMutation.isPending;

  if (quoteQuery.isLoading) {
    return <LoadingState label="Loading quote" />;
  }
  if (quoteQuery.isError || !quote) {
    return (
      <ErrorState
        title="Quote not found"
        onRetry={() => void quoteQuery.refetch()}
      />
    );
  }

  const actionError =
    sendMutation.error instanceof ApiClientError
      ? sendMutation.error.message
      : approveMutation.error instanceof ApiClientError
        ? approveMutation.error.message
        : rejectMutation.error instanceof ApiClientError
          ? rejectMutation.error.message
          : cancelMutation.error instanceof ApiClientError
            ? cancelMutation.error.message
            : generateMutation.error instanceof ApiClientError
              ? generateMutation.error.message
              : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={quote.quoteNumber}
        description={quote.title}
      />
      <QuoteStatusBadge status={quote.status} />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Commercial terms</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-muted-foreground">Agreed deal amount</p>
                <p className="text-lg font-semibold">
                  {formatMoney(quote.total, quote.currency)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment model</p>
                <p className="font-medium">
                  {PAYMENT_MODEL_LABELS[quote.paymentModel]}
                </p>
              </div>
              {quote.requestedBudget != null ? (
                <div>
                  <p className="text-muted-foreground">
                    Original requested budget (historical)
                  </p>
                  <p>{formatMoney(quote.requestedBudget, quote.currency)}</p>
                </div>
              ) : null}
              <div>
                <p className="text-muted-foreground">Customer</p>
                <p className="font-medium">{quote.clientName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Project</p>
                <p className="font-medium">{quote.projectName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Issue / expiry</p>
                <p>
                  {quote.issueDate} → {quote.expiryDate}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentScheduleTable
                items={quote.paymentSchedule}
                currency={quote.currency}
              />
            </CardContent>
          </Card>

          {quote.description ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{quote.description}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Request / project → quote → customer approval → invoices. Quote
                approval is not a payment.
              </p>
              {message ? (
                <p className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-emerald-700 dark:text-emerald-400">
                  {message}
                </p>
              ) : null}
              {actionError ? (
                <p className="text-destructive" role="alert">
                  {actionError}
                </p>
              ) : null}

              {canSend && quote.status === "DRAFT" ? (
                <Button
                  disabled={busy}
                  onClick={() =>
                    void sendMutation.mutateAsync(quote.id).then(() => {
                      setMessage("Quote sent to the customer.");
                    })
                  }
                >
                  Send quote
                </Button>
              ) : null}

              {canApprove && quote.status === "SENT" ? (
                <div className="space-y-2">
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void approveMutation.mutateAsync(quote.id).then(() => {
                        setMessage("Quote approved. EliteFlow can now generate invoices.");
                      })
                    }
                  >
                    Approve quote
                  </Button>
                  <textarea
                    className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Rejection reason"
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                  />
                  <Button
                    variant="outline"
                    disabled={busy || !rejectReason.trim()}
                    onClick={() =>
                      void rejectMutation
                        .mutateAsync({
                          id: quote.id,
                          input: { reason: rejectReason.trim() },
                        })
                        .then(() => setMessage("Quote rejected."))
                    }
                  >
                    Reject quote
                  </Button>
                </div>
              ) : null}

              {canInvoice && quote.status === "APPROVED" ? (
                <Button
                  disabled={busy}
                  onClick={() =>
                    void generateMutation.mutateAsync({ id: quote.id }).then(() => {
                      setMessage("Invoices generated from the payment schedule.");
                    })
                  }
                >
                  Generate invoice(s)
                </Button>
              ) : null}

              {canWrite &&
              (quote.status === "DRAFT" || quote.status === "SENT") ? (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void cancelMutation.mutateAsync(quote.id).then(() => {
                      setMessage("Quote cancelled.");
                    })
                  }
                >
                  Cancel quote
                </Button>
              ) : null}

              <Button variant="ghost" onClick={() => router.push(ROUTES.QUOTES)}>
                Back to quotes
              </Button>
            </CardContent>
          </Card>

          {quote.rejectionReason ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rejection reason</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">{quote.rejectionReason}</CardContent>
            </Card>
          ) : null}

          {quote.paymentSchedule.some((item) => item.invoiceId) ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {quote.paymentSchedule
                  .filter((item) => item.invoiceId)
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="block w-full rounded-md border border-border/60 px-3 py-2 text-left hover:bg-muted/30"
                      onClick={() =>
                        router.push(invoiceDetailPath(item.invoiceId!))
                      }
                    >
                      <span className="font-medium">{item.invoiceNumber}</span>
                      <span className="ml-2 text-muted-foreground">
                        {item.invoiceStatus} / {item.paymentStatus}
                      </span>
                    </button>
                  ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
