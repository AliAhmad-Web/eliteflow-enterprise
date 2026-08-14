"use client";

import type { CustomerRequestDto } from "@enterprise/shared";

type ClarificationHistory = NonNullable<
  CustomerRequestDto["clarificationHistory"]
>;

export function ClarificationHistoryList({
  history,
}: {
  history: ClarificationHistory | null | undefined;
}) {
  if (!history || history.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-3">
      {history.map((entry, index) => (
        <li
          key={`${entry.at}-${entry.from}-${index}`}
          className="rounded-lg border border-border/50 bg-background/60 p-3"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {entry.from === "admin" ? "Admin" : "Customer"} ·{" "}
            {new Date(entry.at).toLocaleString()}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
            {entry.message}
          </p>
        </li>
      ))}
    </ul>
  );
}
