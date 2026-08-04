"use client";

import { getApiErrorMessage } from "@/services/api/api-error";
import { cn } from "@/lib/utils";
import type { EmployeeStatusValue, LeaveRequestStatusValue } from "@enterprise/shared";

export const selectClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50";

/** Directory / Admins toolbar selects — wide enough that labels are not truncated. */
export const toolbarSelectClassName = cn(
  selectClassName,
  "w-auto min-w-56 shrink-0",
);

export function mutationError(error: unknown): string {
  return getApiErrorMessage(error, "Something went wrong. Please try again.");
}

export function DirectorySkeleton({
  viewMode = "list",
}: {
  viewMode?: "list" | "cards";
}) {
  if (viewMode === "cards") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-xl border border-border/50 p-5"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
                <div className="h-5 w-16 rounded-full bg-muted" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-8 w-14 rounded bg-muted" />
              <div className="h-8 w-14 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0 overflow-x-auto">
      <div className="mb-3 flex gap-4 border-b border-border pb-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-4 w-24 animate-pulse rounded bg-muted" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-4 border-b border-border/50 py-3"
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
          <div className="h-4 flex-1 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-5 w-16 rounded-full bg-muted" />
          <div className="h-8 w-24 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function StatusPill({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "success" &&
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        tone === "warning" &&
          "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        tone === "danger" && "bg-red-500/10 text-red-700 dark:text-red-400",
        tone === "default" && "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

export function leaveStatusTone(status: LeaveRequestStatusValue) {
  switch (status) {
    case "APPROVED":
      return "success" as const;
    case "PENDING":
      return "warning" as const;
    case "REJECTED":
      return "danger" as const;
    case "CANCELLED":
      return "default" as const;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function employeeStatusTone(status: EmployeeStatusValue) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "ON_LEAVE":
      return "warning" as const;
    case "INACTIVE":
      return "default" as const;
    case "TERMINATED":
      return "danger" as const;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function EmployeeAvatar({
  name,
  photoUrl,
  size = "md",
}: {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "h-16 w-16 text-lg" : size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={cn("rounded-full object-cover ring-1 ring-border/60", sizeClass)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/15 font-semibold text-primary ring-1 ring-border/60",
        sizeClass,
      )}
    >
      {initials || "?"}
    </div>
  );
}
