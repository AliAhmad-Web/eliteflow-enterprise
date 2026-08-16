"use client";

import type { PaymentScheduleItemDto } from "@enterprise/shared";
import { PAYMENT_SCHEDULE_KIND_LABELS } from "@enterprise/shared";

import { invoiceDetailPath } from "@/constants/routes";
import Link from "next/link";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount);
}

export function PaymentScheduleTable({
  items,
  currency,
  invoiceMode = "staff",
}: {
  items: PaymentScheduleItemDto[];
  currency: string;
  invoiceMode?: "staff" | "customer";
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No payment schedule yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 font-medium">Kind</th>
            <th className="px-3 py-2 font-medium">Percent</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Due</th>
            <th className="px-3 py-2 font-medium">Invoice</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-border/50">
              <td className="px-3 py-2">{item.label}</td>
              <td className="px-3 py-2">
                {PAYMENT_SCHEDULE_KIND_LABELS[item.kind]}
              </td>
              <td className="px-3 py-2">{item.percent}%</td>
              <td className="px-3 py-2 font-medium">
                {formatMoney(item.amount, currency)}
              </td>
              <td className="px-3 py-2">{item.dueDate ?? "—"}</td>
              <td className="px-3 py-2">
                {item.invoiceId ? (
                  <Link
                    href={invoiceDetailPath(item.invoiceId)}
                    className="text-primary hover:underline"
                  >
                    {item.invoiceNumber}
                  </Link>
                ) : invoiceMode === "customer" ? (
                  <span className="text-muted-foreground">
                    {item.kind === "ADVANCE"
                      ? "Use Pay Advance above"
                      : "After advance is verified"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not generated</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
