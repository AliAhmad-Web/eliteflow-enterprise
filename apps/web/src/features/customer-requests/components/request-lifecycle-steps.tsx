"use client";

import type { CustomerRequestStatusValue } from "@enterprise/shared";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: "submitted", label: "Submitted" },
  { id: "review", label: "Review" },
  { id: "accepted", label: "Approved & accepted" },
] as const;

function activeStep(status: CustomerRequestStatusValue): number {
  switch (status) {
    case "DRAFT":
      return -1;
    case "SUBMITTED":
      return 0;
    case "UNDER_REVIEW":
    case "CLARIFICATION_REQUESTED":
      return 1;
    case "APPROVED":
    case "CONVERTED":
      return 2;
    default:
      return -1;
  }
}

export function RequestLifecycleSteps({
  status,
}: {
  status: CustomerRequestStatusValue;
}) {
  if (status === "REJECTED" || status === "CANCELLED" || status === "DRAFT") {
    return null;
  }

  const current = activeStep(status);

  return (
    <ol className="flex flex-wrap gap-2 text-xs">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={step.id}
            className={cn(
              "rounded-full border px-3 py-1 font-medium",
              done && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
              active &&
                "border-primary/30 bg-primary/10 text-primary",
              !done &&
                !active &&
                "border-border/60 bg-muted/40 text-muted-foreground",
            )}
          >
            {index + 1}. {step.label}
          </li>
        );
      })}
    </ol>
  );
}
