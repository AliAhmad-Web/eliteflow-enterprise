import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, disabled, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-30 w-full rounded-lg border border-input/90 bg-card px-3 py-2.5 text-sm leading-5 text-foreground shadow-(--shadow-xs)",
          "transition-[border-color,box-shadow,background-color] duration-150 ease-(--ease-enterprise)",
          "placeholder:text-muted-foreground/70",
          "hover:border-border",
          "focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error &&
            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/35",
          className,
        )}
        ref={ref}
        disabled={disabled}
        aria-invalid={error}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
