"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { InvoiceStatusBadge } from "@/components/common/display/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format-money";

import type { RecentInvoice } from "@/features/dashboard/types/dashboard.types";

interface RecentInvoicesCardProps {
  invoices: RecentInvoice[];
  title?: string;
  className?: string;
  viewAllHref?: string;
}

export function RecentInvoicesCard({
  invoices,
  title = "Recent Invoices",
  className,
  viewAllHref = ROUTES.INVOICES,
}: RecentInvoicesCardProps) {
  return (
    <Card className={cn("border-border/50 overflow-hidden shadow-(--shadow-sm)", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs text-primary hover:text-primary"
          asChild
        >
          <Link href={viewAllHref}>
            View all
            <ArrowRight strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="Billing activity will appear here when invoices are created."
            actionLabel="Open billing"
            actionHref={viewAllHref}
            className="min-h-50 border-0 bg-transparent"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-100 text-sm">
              <thead>
                <tr>
                  <th scope="col">Invoice</th>
                  <th scope="col">Client</th>
                  <th scope="col" className="text-right!">
                    Amount
                  </th>
                  <th scope="col" className="text-right!">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="font-medium tracking-tight text-foreground">
                      {invoice.number ?? invoice.id}
                    </td>
                    <td className="text-muted-foreground">{invoice.client}</td>
                    <td className="text-right font-semibold tabular-nums text-foreground">
                      {formatMoney(invoice.amount)}
                    </td>
                    <td className="text-right">
                      <InvoiceStatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
