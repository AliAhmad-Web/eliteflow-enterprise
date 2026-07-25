"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface AuthAlertProps {
  variant: "error" | "success";
  title: string;
  description?: string;
  className?: string;
}

export function AuthAlert({
  variant,
  title,
  description,
  className,
}: AuthAlertProps) {
  const Icon = variant === "error" ? AlertCircle : CheckCircle2;

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        variant === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-success/30 bg-success/10 text-success",
        className,
      )}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{title}</p>
          {description ? (
            <p className="text-sm opacity-90">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
