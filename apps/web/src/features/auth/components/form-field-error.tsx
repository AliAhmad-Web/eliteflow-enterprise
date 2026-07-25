"use client";

import { cn } from "@/lib/utils";

interface FormFieldErrorProps {
  message?: string;
  className?: string;
}

export function FormFieldError({ message, className }: FormFieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p className={cn("text-sm text-destructive", className)} role="alert">
      {message}
    </p>
  );
}
