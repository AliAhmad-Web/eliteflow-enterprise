"use client";

import {
  PAYMENT_MODEL_LABELS,
  type PaymentModelValue,
  type QuoteDto,
} from "@enterprise/shared";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useInvoice } from "@/features/invoices/hooks/use-invoices";
import { InvoicePayPanel } from "@/features/payments/components/invoice-pay-panel";
import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { ApiClientError } from "@/services/api/api-error";

import {
  useApproveQuote,
  useSelectQuotePaymentModel,
} from "../hooks/use-quote-mutations";

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

export function CustomerAdvancePaymentPanel({ quote }: { quote: QuoteDto }) {
  const approveMutation = useApproveQuote();
  const selectModelMutation = useSelectQuotePaymentModel();
  const [issuedQuote, setIssuedQuote] = useState<QuoteDto | null>(null);
  const current =
    quote.paymentSchedule.some((item) => item.invoiceId) || !issuedQuote
      ? quote
      : issuedQuote;
  const [payOpen, setPayOpen] = useState(
    current.status === "APPROVED" ||
      Boolean(current.paymentSchedule[0]?.invoiceId),
  );

  const advanceInvoiceId =
    current.paymentSchedule.find((item) => item.kind === "ADVANCE")?.invoiceId ??
    current.paymentSchedule[0]?.invoiceId ??
    null;

  const pendingVerification =
    current.commercialStage === "PENDING_VERIFICATION" ||
    current.commercialStage === "PAYMENT_PROOF_SUBMITTED";
  const verified =
    current.commercialStage === "PAYMENT_VERIFIED" ||
    current.commercialStage === "PROJECT_STARTED";

  const invoiceQuery = useInvoice(payOpen && !verified ? advanceInvoiceId : null, {
    refetchInterval: 8_000,
  });

  useEffect(() => {
    if (advanceInvoiceId && current.status === "APPROVED") {
      setPayOpen(true);
    }
  }, [advanceInvoiceId, current.status]);

  const selectableModels = useMemo(
    () =>
      (current.allowedPaymentModels ?? []).filter(
        (model) => model !== "CUSTOM" && model !== "MILESTONE",
      ),
    [current.allowedPaymentModels],
  );

  const busy = approveMutation.isPending || selectModelMutation.isPending;
  const actionError =
    approveMutation.error instanceof ApiClientError
      ? approveMutation.error.message
      : selectModelMutation.error instanceof ApiClientError
        ? selectModelMutation.error.message
        : null;
  const canChangeModel =
    current.status === "SENT" &&
    selectableModels.length > 1 &&
    !current.paymentSchedule.some((item) => item.invoiceId);

  async function startPayAdvance() {
    if (current.status === "SENT") {
      const approved = await approveMutation.mutateAsync(current.id);
      setIssuedQuote(approved);
    }
    setPayOpen(true);
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-base font-semibold">Project Approved & Accepted</p>
        <p className="mt-1 text-base font-semibold">Advance Payment Required</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Final agreed deal
          </p>
          <p className="text-lg font-semibold">
            {formatMoney(current.dealAmount ?? current.total, current.currency)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Required advance
          </p>
          <p className="text-lg font-semibold">
            {formatMoney(current.advanceRequired, current.currency)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Paid</p>
          <p className="font-medium">
            {formatMoney(current.paidAmount, current.currency)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Remaining</p>
          <p className="font-medium">
            {formatMoney(current.remainingAmount, current.currency)}
          </p>
        </div>
      </div>

      <div>
        <p className="text-muted-foreground">Payment model</p>
        <p className="font-medium">{PAYMENT_MODEL_LABELS[current.paymentModel]}</p>
      </div>

      {canChangeModel ? (
        <select
          className={FORM_SELECT_CLASS}
          value={current.paymentModel}
          disabled={busy}
          onChange={(event) =>
            void selectModelMutation.mutateAsync({
              id: current.id,
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
      ) : null}

      {actionError ? (
        <p className="text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {pendingVerification ? (
        <p className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          Payment proof submitted. Waiting for EliteFlow verification. Your
          project dashboard stays locked until the advance is verified.
        </p>
      ) : null}

      {verified ? (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-emerald-800 dark:text-emerald-300">
          <p className="font-medium">Payment Verified</p>
          <p>
            Paid {formatMoney(current.paidAmount, current.currency)}. Remaining{" "}
            {formatMoney(current.remainingAmount, current.currency)}.
          </p>
          <p>
            Your payment has been verified successfully. Your project is now
            ready to start. Your project dashboard is unlocked.
          </p>
        </div>
      ) : null}

      {!verified && !payOpen ? (
        <Button disabled={busy} onClick={() => void startPayAdvance()}>
          Pay Advance
        </Button>
      ) : null}

      {!verified && payOpen && invoiceQuery.isLoading ? (
        <p className="text-muted-foreground">Loading payment methods…</p>
      ) : null}

      {!verified && payOpen && invoiceQuery.data ? (
        <div className="space-y-2">
          <p className="font-medium">Pay Advance</p>
          <InvoicePayPanel invoice={invoiceQuery.data} title="Pay Advance" />
        </div>
      ) : null}
    </div>
  );
}
