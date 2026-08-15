"use client";

import { PERMISSIONS, type QuoteDto } from "@enterprise/shared";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES, quoteDetailPath } from "@/constants/routes";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";

import { useQuotes } from "../hooks/use-quotes";
import { CustomerAdvancePaymentPanel } from "./customer-advance-payment-panel";
import { QuoteStatusBadge } from "./quote-status-badge";

function pickActiveQuote(items: QuoteDto[] | undefined): QuoteDto | null {
  if (!items?.length) return null;
  return (
    items.find((item) => item.status === "SENT") ??
    items.find((item) => item.status === "APPROVED") ??
    items[0] ??
    null
  );
}

export function CustomerCommercialCard({
  customerRequestId,
}: {
  customerRequestId?: string;
}) {
  const canRead = useHasPermission(PERMISSIONS.QUOTES_READ);
  const quotesQuery = useQuotes(
    {
      search: "",
      ...(customerRequestId ? { customerRequestId } : {}),
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
      limit: 10,
    },
    { refetchInterval: 8_000 },
  );

  if (!canRead || quotesQuery.isLoading) return null;
  const quote = pickActiveQuote(quotesQuery.data?.items);
  if (!quote || (quote.status !== "SENT" && quote.status !== "APPROVED")) {
    return null;
  }

  return (
    <Card className="border-border/50 shadow-(--shadow-sm)">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-semibold tracking-tight">
            {quote.projectName}
          </CardTitle>
          <QuoteStatusBadge status={quote.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CustomerAdvancePaymentPanel quote={quote} />
        <div>
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
        </div>
      </CardContent>
    </Card>
  );
}
