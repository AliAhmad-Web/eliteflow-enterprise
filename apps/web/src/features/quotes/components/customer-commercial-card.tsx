"use client";

import { PAYMENT_MODEL_LABELS, PERMISSIONS } from "@enterprise/shared";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES, quoteDetailPath } from "@/constants/routes";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";

import { useQuotes } from "../hooks/use-quotes";
import { QuoteStatusBadge } from "./quote-status-badge";

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

export function CustomerCommercialCard() {
  const canRead = useHasPermission(PERMISSIONS.QUOTES_READ);
  const quotesQuery = useQuotes({
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    limit: 5,
  });

  if (!canRead) return null;

  const quote = quotesQuery.data?.items[0];
  if (!quote) return null;

  return (
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
          <p className="text-muted-foreground">Agreed deal amount</p>
          <p className="text-lg font-semibold">
            {formatMoney(quote.total, quote.currency)}
          </p>
          {quote.requestedBudget != null &&
          quote.requestedBudget !== quote.total ? (
            <p className="text-xs text-muted-foreground">
              Original requested budget {formatMoney(quote.requestedBudget, quote.currency)} is
              historical only.
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-muted-foreground">Payment model</p>
          <p className="font-medium">{PAYMENT_MODEL_LABELS[quote.paymentModel]}</p>
        </div>
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
  );
}
