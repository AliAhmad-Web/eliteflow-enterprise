"use client";

import {
  PAYMENT_MODEL_LABELS,
  PERMISSIONS,
  type PaymentModelValue,
  type QuoteDto,
} from "@enterprise/shared";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROUTES, quoteDetailPath } from "@/constants/routes";
import { useInvoice } from "@/features/invoices/hooks/use-invoices";
import { InvoicePayPanel } from "@/features/payments/components/invoice-pay-panel";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { ApiClientError } from "@/services/api/api-error";

import {
  useApproveQuote,
  useSelectQuotePaymentModel,
} from "../hooks/use-quote-mutations";
import { useQuotes } from "../hooks/use-quotes";
import { QuoteStatusBadge } from "./quote-status-badge";

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

function pickActiveQuote(items: QuoteDto[] | undefined): QuoteDto | null {
  if (!items?.length) return null;
  return (
    items.find((item) => item.status === "SENT") ??
    items.find((item) => item.status === "APPROVED") ??
    items[0] ??
    null
  );
}

export function CustomerCommercialCard() {
  const canRead = useHasPermission(PERMISSIONS.QUOTES_READ);
  const quotesQuery = useQuotes({
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    limit: 10,
  });
  const approveMutation = useApproveQuote();
  const selectModelMutation = useSelectQuotePaymentModel();
  const [modalOpen, setModalOpen] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);

  const quote = pickActiveQuote(quotesQuery.data?.items);
  const advanceInvoiceId =
    quote?.paymentSchedule.find((item) => item.kind === "ADVANCE")?.invoiceId ??
    quote?.paymentSchedule[0]?.invoiceId ??
    null;
  const invoiceQuery = useInvoice(showAdvance || quote?.status === "APPROVED" ? advanceInvoiceId : null);

  useEffect(() => {
    if (quote?.status === "SENT") {
      setModalOpen(true);
    }
    if (quote?.status === "APPROVED") {
      setShowAdvance(true);
    }
  }, [quote?.id, quote?.status]);

  const selectableModels = useMemo(
    () => (quote?.allowedPaymentModels ?? []).filter((model) => model !== "CUSTOM" && model !== "MILESTONE"),
    [quote?.allowedPaymentModels],
  );

  if (!canRead) return null;

  if (quotesQuery.isLoading) return null;

  if (!quote) return null;

  const busy = approveMutation.isPending || selectModelMutation.isPending;
  const actionError =
    approveMutation.error instanceof ApiClientError
      ? approveMutation.error.message
      : selectModelMutation.error instanceof ApiClientError
        ? selectModelMutation.error.message
        : null;
  const advancePaid =
    quote.paymentSchedule.some(
      (item) =>
        (item.kind === "ADVANCE" || quote.paymentSchedule.length === 1) &&
        item.paymentStatus === "PAID",
    ) || quote.overallPaymentStatus === "PAID";

  async function acceptAndStart() {
    if (!quote) return;
    await approveMutation.mutateAsync(quote.id);
    setModalOpen(false);
    setShowAdvance(true);
  }

  return (
    <>
      <Card className="border-border/50 shadow-(--shadow-sm)">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold tracking-tight">
            Commercial summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-muted-foreground">Current project</p>
              <p className="font-medium">{quote.projectName}</p>
            </div>
            <QuoteStatusBadge status={quote.status} />
          </div>
          <div>
            <p className="text-muted-foreground">Total Deal</p>
            <p className="text-lg font-semibold">
              {formatMoney(quote.dealAmount ?? quote.total, quote.currency)}
            </p>
            {quote.requestedBudget != null &&
            quote.requestedBudget !== quote.total ? (
              <p className="text-xs text-muted-foreground">
                Original requested budget{" "}
                {formatMoney(quote.requestedBudget, quote.currency)} is
                historical only.
              </p>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Advance Required</p>
              <p className="font-medium">
                {formatMoney(quote.advanceRequired, quote.currency)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Paid</p>
              <p className="font-medium">
                {formatMoney(quote.paidAmount, quote.currency)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Remaining</p>
              <p className="font-medium">
                {formatMoney(quote.remainingAmount, quote.currency)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Payment Status</p>
              <p className="font-medium">{quote.overallPaymentStatus}</p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Payment model</p>
            <p className="font-medium">{PAYMENT_MODEL_LABELS[quote.paymentModel]}</p>
          </div>
          {quote.status === "SENT" && selectableModels.length > 1 ? (
            <div className="space-y-2">
              <p className="text-muted-foreground">Available payment options</p>
              <select
                className={FORM_SELECT_CLASS}
                value={quote.paymentModel}
                disabled={busy}
                onChange={(event) =>
                  void selectModelMutation.mutateAsync({
                    id: quote.id,
                    input: {
                      paymentModel: event.target.value as PaymentModelValue,
                    },
                  })
                }
              >
                {selectableModels.map((model) => (
                  <option key={model} value={model}>
                    {PAYMENT_MODEL_LABELS[model]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <ul className="space-y-1">
            {quote.paymentSchedule.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.label}</span>
                <span className="tabular-nums">
                  {formatMoney(item.amount, quote.currency)}
                  {item.paymentStatus ? ` · ${item.paymentStatus}` : ""}
                </span>
              </li>
            ))}
          </ul>
          {actionError ? (
            <p className="text-destructive" role="alert">
              {actionError}
            </p>
          ) : null}
          {quote.status === "SENT" ? (
            <Button disabled={busy} onClick={() => void acceptAndStart()}>
              Accept & Start Project
            </Button>
          ) : null}
          {advancePaid ? (
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-emerald-800 dark:text-emerald-300">
              Advance Payment Received — Project Ready to Start
            </div>
          ) : null}
          {showAdvance && invoiceQuery.data && !advancePaid ? (
            <div className="space-y-2">
              <p className="font-medium">Advance Payment</p>
              <InvoicePayPanel invoice={invoiceQuery.data} />
            </div>
          ) : null}
          <Link
            href={quoteDetailPath(quote.id)}
            className="inline-flex text-sm font-medium text-primary hover:underline"
          >
            View quote
          </Link>
          <Link
            href={ROUTES.INVOICES}
            className="ml-4 inline-flex text-sm font-medium text-primary hover:underline"
          >
            View invoices
          </Link>
        </CardContent>
      </Card>

      <Dialog open={modalOpen && quote.status === "SENT"} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your project has been approved</DialogTitle>
            <DialogDescription>
              We are ready to start your project.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            Final agreed deal amount:{" "}
            <span className="font-semibold">
              {formatMoney(quote.dealAmount ?? quote.total, quote.currency)}
            </span>
          </p>
          {quote.requestedBudget != null &&
          quote.requestedBudget !== quote.total ? (
            <p className="text-xs text-muted-foreground">
              Your original request of{" "}
              {formatMoney(quote.requestedBudget, quote.currency)} is historical
              only.
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Review later
            </Button>
            <Button disabled={busy} onClick={() => void acceptAndStart()}>
              Accept & Start Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
