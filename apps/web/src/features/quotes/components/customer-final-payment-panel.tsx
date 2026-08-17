"use client";

import type { QuoteDto } from "@enterprise/shared";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ROUTES, invoiceDetailPath } from "@/constants/routes";
import { useInvoice } from "@/features/invoices/hooks/use-invoices";
import { InvoicePayPanel } from "@/features/payments/components/invoice-pay-panel";
import { formatMoney } from "@/lib/format-money";

function firstScheduleItem(quote: QuoteDto) {
  return (
    quote.paymentSchedule.find((item) => item.kind === "ADVANCE") ??
    quote.paymentSchedule[0] ??
    null
  );
}

function finalInvoiceId(quote: QuoteDto): string | null {
  const first = firstScheduleItem(quote);
  const remaining = quote.paymentSchedule.filter(
    (item) => item.id !== first?.id && item.invoiceId,
  );
  const unpaid = remaining.find(
    (item) => item.paymentStatus !== "PAID" && item.invoiceId,
  );
  return unpaid?.invoiceId ?? remaining[0]?.invoiceId ?? null;
}

export function CustomerFinalPaymentPanel({ quote }: { quote: QuoteDto }) {
  const [payOpen, setPayOpen] = useState(false);
  const invoiceId = useMemo(() => finalInvoiceId(quote), [quote]);
  const due = quote.commercialStage === "FINAL_PAYMENT_DUE";
  const complete = quote.commercialStage === "FINAL_PAYMENT_COMPLETE";
  const pending =
    due &&
    quote.paymentSchedule.some(
      (item) =>
        item.kind !== "ADVANCE" &&
        (item.paymentStatus === "PENDING" ||
          item.paymentStatus === "PARTIALLY_PAID"),
    );

  const invoiceQuery = useInvoice(payOpen && due ? invoiceId : null, {
    refetchInterval: 8_000,
  });

  const advancePaid = quote.paidAmount;
  const remaining = quote.remainingAmount;

  if (complete) {
    return (
      <div className="space-y-4 text-sm">
        <div>
          <p className="text-base font-semibold">Final Payment Completed</p>
          <p className="mt-1 text-muted-foreground">
            Project payment is complete. Outstanding balance is{" "}
            {formatMoney(0, quote.currency)}.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Project</p>
            <p className="font-medium">{quote.projectName}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              Total Project Amount
            </p>
            <p className="font-medium">
              {formatMoney(quote.dealAmount ?? quote.total, quote.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              Advance Paid
            </p>
            <p className="font-medium">
              {formatMoney(advancePaid, quote.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              Outstanding
            </p>
            <p className="font-medium">
              {formatMoney(remaining, quote.currency)}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-emerald-800 dark:text-emerald-300">
          <p className="font-medium">Payment Status: PAID</p>
          <p>Project Payment Complete</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={ROUTES.PROJECTS}>Review Project</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.INVOICES}>View Receipt / Invoices</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!due) return null;

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-base font-semibold">Project Completed</p>
        <p className="mt-1 text-muted-foreground">
          Your project has been marked as completed.
        </p>
      </div>

      <div>
        <p className="text-base font-semibold">Final Payment Due</p>
        <p className="mt-1 text-muted-foreground">
          Remaining amount:{" "}
          <span className="font-semibold text-foreground">
            {formatMoney(remaining, quote.currency)}
          </span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Project</p>
          <p className="font-medium">{quote.projectName}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Status</p>
          <p className="font-medium">{quote.projectStatus ?? "COMPLETED"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Total Project Amount
          </p>
          <p className="font-medium">
            {formatMoney(quote.dealAmount ?? quote.total, quote.currency)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Advance Paid</p>
          <p className="font-medium">
            {formatMoney(advancePaid, quote.currency)}
          </p>
        </div>
      </div>

      {pending ? (
        <p className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          Payment Submitted — waiting for EliteFlow verification. Final payment
          is complete only after an administrator verifies your payment.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!pending ? (
          <Button
            type="button"
            disabled={!invoiceId}
            onClick={() => setPayOpen(true)}
          >
            Pay Final Amount
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href={ROUTES.PROJECTS}>Review Project</Link>
        </Button>
        {invoiceId ? (
          <Button asChild variant="ghost">
            <Link href={invoiceDetailPath(invoiceId)}>
              View Payment Details
            </Link>
          </Button>
        ) : null}
      </div>

      {payOpen && !invoiceQuery.data && invoiceQuery.isLoading ? (
        <p className="text-muted-foreground">Loading payment methods…</p>
      ) : null}

      {payOpen && invoiceQuery.data ? (
        <div className="space-y-2">
          <p className="font-medium">Pay Remaining Amount</p>
          <InvoicePayPanel
            invoice={invoiceQuery.data}
            title="Pay Remaining Amount"
          />
        </div>
      ) : null}
    </div>
  );
}
